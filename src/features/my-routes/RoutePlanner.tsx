// RoutePlanner.tsx — 경로 작성 페이지 (상태 오케스트레이터)
//
// 경로 탐색
//  경유지를 찍으면 Valhalla 공개 API 로 도로 경로를 자동 계산합니다.
//  고속도로·자동차전용도로를 강하게 기피하고 일반 도로를 우선 사용합니다.
//  API 실패 시 직선으로 표시합니다.
//
// 마커 상호작용
//  짧은 탭 → 삭제 팝업 / 꾹 누르기(600ms) → 로드뷰

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useNavigate, useLocation }               from 'react-router-dom'
import { motion, AnimatePresence }                from 'framer-motion'
import { PenLine, Loader2, Search }                from 'lucide-react'

import { saveCourse, loadCourses, updateCourse, shareToCommunity, buildGpxXml, type SavedCourse } from '../../lib/courseStorage'
import { insertMyCourse, updateMyCourse } from '../../lib/courseService'
import { totalDist, type LatLng }     from './routes/routeUtils'
import { fetchRoute }                 from './planner/routing'
import RoadviewModal                  from '../../components/RoadviewModal'

import PlannerMap         from './planner/PlannerMap'
import PlannerHeader      from './planner/PlannerHeader'
import DeleteBubble       from './planner/DeleteBubble'
import ConfirmPanel       from './planner/ConfirmPanel'
import WaypointListSheet  from './planner/WaypointListSheet'
import PlaceSearchPanel   from './planner/PlaceSearchPanel'
import type { DeleteTarget } from './planner/plannerUtils'

export default function RoutePlanner() {
  const navigate = useNavigate()
  const location = useLocation()

  // ── 코스 상세에서 "수정하기"로 진입 시 전달되는 상태 ──────────────────────
  const importState = (location.state ?? {}) as {
    importedWaypoints?: LatLng[]
    userPos?:           LatLng
    editCourseId?:      string
    editCourseTitle?:   string
  }
  const importedWaypoints = importState.importedWaypoints
  const importUserPos     = importState.userPos ?? null
  const isImportMode      = !!(importedWaypoints && importedWaypoints.length > 0)

  // ⚠️ useRef로 고정: pushState가 React Router location.state를 덮어써서
  //    re-render 시 editCourseId가 null이 되는 버그 방지
  const editCourseIdRef    = useRef(importState.editCourseId ?? null)
  const editCourseTitleRef = useRef(importState.editCourseTitle ?? '')
  const editCourseId       = editCourseIdRef.current
  const editCourseTitle    = editCourseTitleRef.current

  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const exitingRef = useRef(false)

  // ── 하드웨어 뒤로가기 → 종료 확인 모달 ──────────────────────────────
  useEffect(() => {
    exitingRef.current = false
    window.history.pushState({ routePlannerSentinel: true }, '')
    const onPop = () => {
      if (exitingRef.current) return
      // 로드뷰 X 버튼으로 닫히면서 발생한 history.back() → 경고창 띄우지 않음
      if ((window as any).__motoRoadviewClosing) {
        ;(window as any).__motoRoadviewClosing = false
        setTimeout(() => {
          if (!exitingRef.current)
            window.history.pushState({ routePlannerSentinel: true }, '')
        }, 0)
        return
      }
      // Android 일부 브라우저에서 popstate 안에서 pushState 무시 → setTimeout 으로 우회
      setTimeout(() => {
        if (!exitingRef.current)
          window.history.pushState({ routePlannerSentinel: true }, '')
      }, 0)
      setShowExitConfirm(true)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function confirmExit() {
    exitingRef.current = true
    setShowExitConfirm(false)
    navigate('/my-routes', { replace: true })
  }
  function cancelExit() {
    setShowExitConfirm(false)
    if (!window.history.state?.routePlannerSentinel)
      window.history.pushState({ routePlannerSentinel: true }, '')
  }

  // ── 경유지 + 경로 세그먼트 ────────────────────────────────────────────────
  // segments[i] = points[i] → points[i+1] 사이 도로 경로 좌표 배열
  const [points,       setPoints]       = useState<LatLng[]>([])
  const [segments,     setSegments]     = useState<LatLng[][]>([])
  const [routing,      setRouting]      = useState(false)   // API 호출 중 여부

  // 스테일 클로저 방지: handleAddPoint 내에서 최신 points 를 읽기 위한 ref
  const latestPointsRef = useRef<LatLng[]>([])

  // ── 일반 UI 상태 ──────────────────────────────────────────────────────────
  const [stage,          setStage]          = useState<'DRAW' | 'CONFIRM'>('DRAW')
  const [title,          setTitle]          = useState(editCourseTitle)
  const [tip,            setTip]            = useState('')
  const [done,           setDone]           = useState(false)
  const [roadviewPos,    setRoadviewPos]    = useState<{ lat: number; lng: number } | null>(null)
  const [deleteTarget,   setDeleteTarget]   = useState<DeleteTarget | null>(null)
  const [showWpList,     setShowWpList]     = useState(false)
  const [showSearch,     setShowSearch]     = useState(false)
  const [pointNames,     setPointNames]     = useState<string[]>([])
  const [mapPanTo,       setMapPanTo]       = useState<LatLng | undefined>(undefined)
  const [previewPos,     setPreviewPos]     = useState<LatLng | undefined>(undefined)

  const locked = stage === 'CONFIRM'

  // ── 표시 경로 (segments 에서 조합, 없는 구간은 직선) ───────────────────────
  const displayPath = useMemo((): LatLng[] => {
    if (points.length < 2) return []
    const result: LatLng[] = [points[0]]
    for (let i = 0; i < points.length - 1; i++) {
      const seg = segments[i]
      if (seg && seg.length >= 2) result.push(...seg.slice(1))   // 도로 경로
      else                        result.push(points[i + 1])     // 직선 fallback
    }
    return result
  }, [points, segments])

  const dist    = totalDist(displayPath.length >= 2 ? displayPath : points)
  const canSave = locked && title.trim().length >= 1 && points.length >= 2 && !done && !routing

  // ── 역지오코딩: 좌표 → 주소명 ──────────────────────────────────────────
  const geocodeName = useCallback((lat: number, lng: number, idx: number) => {
    if (!window.kakao?.maps?.services?.Geocoder) return
    const geocoder = new window.kakao.maps.services.Geocoder()
    geocoder.coord2Address(lng, lat, (result: any[], status: string) => {
      const OK = window.kakao?.maps?.services?.Status?.OK
      const name = status === OK
        ? (result[0]?.road_address?.address_name || result[0]?.address?.address_name || '')
        : ''
      setPointNames(prev => {
        const next = [...prev]
        next[idx] = name
        return next
      })
    })
  }, [])

  // ── 경유지 추가 (최대 20개) ───────────────────────────────────────────────
  const MAX_POINTS = 20
  const handleAddPoint = useCallback((lat: number, lng: number) => {
    if (latestPointsRef.current.length >= MAX_POINTS) return
    const newPoint: LatLng = { lat, lng }
    const prev = latestPointsRef.current
    const newIdx = prev.length
    latestPointsRef.current = [...prev, newPoint]
    setPoints([...latestPointsRef.current])
    geocodeName(lat, lng, newIdx)   // 역지오코딩

    if (prev.length > 0) {
      const fromPt = prev[prev.length - 1]
      const segIdx = prev.length - 1
      setRouting(true)
      fetchRoute(fromPt, newPoint)
        .then(seg => setSegments(segs => {
          const next = [...segs]
          next[segIdx] = seg
          return next
        }))
        .finally(() => setRouting(false))
    }
  }, [geocodeName])

  // ── 말풍선 ────────────────────────────────────────────────────────────────
  const handleMarkerTap     = useCallback((idx: number, sx: number, sy: number) =>
    setDeleteTarget({ idx, screenX: sx, screenY: sy }), [])
  const handleDismissBubble = useCallback(() => setDeleteTarget(null), [])
  const handleLongPress     = useCallback((lat: number, lng: number) =>
    setRoadviewPos({ lat, lng }), [])

  const handleDelete = useCallback((idx: number) => {
    setDeleteTarget(null)
    const prev = latestPointsRef.current
    const next = prev.filter((_, j) => j !== idx)
    latestPointsRef.current = next
    setPoints([...next])
    setPointNames(ns => ns.filter((_, j) => j !== idx))

    if (next.length >= 2 && idx > 0 && idx < prev.length - 1) {
      // 중간 포인트 삭제: 양쪽 구간을 합쳐서 재탐색
      setRouting(true)
      fetchRoute(prev[idx - 1], prev[idx + 1])
        .then(newSeg => setSegments(segs => {
          const arr = [...segs]
          arr.splice(idx - 1, 2, newSeg)   // 삭제된 구간 2개 → 새 구간 1개
          return arr
        }))
        .finally(() => setRouting(false))
    } else {
      setSegments(segs =>
        idx === 0 ? segs.slice(1) : segs.slice(0, -1)
      )
    }
  }, [])

  // ── 경유지 순서 변경 (전체 세그먼트 재계산) ─────────────────────────────
  const recomputeAllSegments = useCallback((pts: LatLng[]) => {
    if (pts.length < 2) { setSegments([]); return }
    setRouting(true)
    const pairs = pts.slice(0, -1).map((from, i) => fetchRoute(from, pts[i + 1]))
    Promise.all(pairs)
      .then(segs => setSegments(segs))
      .finally(() => setRouting(false))
  }, [])

  const handleMoveUp = useCallback((idx: number) => {
    if (idx === 0) return
    const next = [...latestPointsRef.current]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    latestPointsRef.current = next
    setPoints([...next])
    setPointNames(ns => { const a = [...ns]; [a[idx-1], a[idx]] = [a[idx], a[idx-1]]; return a })
    setDeleteTarget(null)
    recomputeAllSegments(next)
  }, [recomputeAllSegments])

  const handleMoveDown = useCallback((idx: number) => {
    const pts = latestPointsRef.current
    if (idx >= pts.length - 1) return
    const next = [...pts]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    latestPointsRef.current = next
    setPoints([...next])
    setPointNames(ns => { const a = [...ns]; [a[idx], a[idx+1]] = [a[idx+1], a[idx]]; return a })
    setDeleteTarget(null)
    recomputeAllSegments(next)
  }, [recomputeAllSegments])

  // ── 임포트 모드: 공유 경로 경유지 초기 로드 + 역지오코딩 ─────────────────
  useEffect(() => {
    if (!isImportMode || !importedWaypoints || importedWaypoints.length === 0) return
    latestPointsRef.current = importedWaypoints
    setPoints([...importedWaypoints])
    // 역지오코딩은 Kakao SDK 로드 후 실행 (약간 딜레이)
    const geocodeAll = () => {
      importedWaypoints.forEach((pt, i) => geocodeName(pt.lat, pt.lng, i))
    }
    if (window.kakao?.maps?.services?.Geocoder) geocodeAll()
    else setTimeout(geocodeAll, 1500)   // SDK 로드 대기
    if (importedWaypoints.length < 2) return
    setRouting(true)
    const pairs = importedWaypoints.slice(0, -1).map((from, i) =>
      fetchRoute(from, importedWaypoints[i + 1])
    )
    Promise.all(pairs)
      .then(segs => setSegments(segs))
      .finally(() => setRouting(false))
  }, [geocodeName]) // eslint-disable-line

  // ── 임포트 모드: 경유지 선택 → 현재 위치에서 연결 ────────────────────────
  const handleConnectFromHere = useCallback((idx: number) => {
    if (!importUserPos) return
    setDeleteTarget(null)
    const tail      = latestPointsRef.current.slice(idx)   // 선택 경유지 + 이후 포인트
    const newPoints = [importUserPos, ...tail]
    latestPointsRef.current = newPoints
    setPoints([...newPoints])
    setRouting(true)
    // 현재위치 → 선택 경유지 경로 계산 후 이후 세그먼트 유지
    fetchRoute(importUserPos, tail[0])
      .then(seg0 => {
        setSegments(prev => {
          const tailSegs = prev.slice(idx)   // 선택 경유지 이후 기존 세그먼트
          return [seg0, ...tailSegs]
        })
      })
      .finally(() => setRouting(false))
  }, [importUserPos])

  // ── 장소 검색으로 경유지 추가 (이름 이미 알고 있으므로 역지오코딩 생략) ─
  const handleAddFromSearch = useCallback((lat: number, lng: number, name: string) => {
    if (latestPointsRef.current.length >= MAX_POINTS) return
    const newPoint: LatLng = { lat, lng }
    const prev = latestPointsRef.current
    const newIdx = prev.length
    latestPointsRef.current = [...prev, newPoint]
    setPoints([...latestPointsRef.current])
    setPointNames(ns => { const a = [...ns]; a[newIdx] = name; return a })
    setMapPanTo({ lat, lng })   // 지도 해당 위치로 이동
    if (prev.length > 0) {
      setRouting(true)
      fetchRoute(prev[prev.length - 1], newPoint)
        .then(seg => setSegments(segs => { const n = [...segs]; n[prev.length - 1] = seg; return n }))
        .finally(() => setRouting(false))
    }
  }, [])

  // ── 실행취소 · 전체삭제 ──────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    latestPointsRef.current = latestPointsRef.current.slice(0, -1)
    setPoints([...latestPointsRef.current])
    setSegments(s => s.slice(0, -1))
    setDeleteTarget(null)
  }, [])

  const handleClear = useCallback(() => {
    latestPointsRef.current = []
    setPoints([])
    setSegments([])
    setStage('DRAW')
    setDeleteTarget(null)
  }, [])

  const handleConfirm = useCallback(() => {
    setStage('CONFIRM')
    setDeleteTarget(null)
  }, [])

  // ── 저장 ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback((isPublic: boolean) => {
    if (!canSave) return
    const now     = Date.now()
    const savePts = displayPath.length >= 2 ? displayPath : points
    const gpxPts  = savePts.map((p, i) => ({
      lat: p.lat, lng: p.lng, timestamp: now + i * 1_000,
    }))
    const newWaypoints = points.map(p => ({ lat: p.lat, lng: p.lng }))

    // ── 수정 모드: 기존 코스의 경유지·경로만 갱신, 나머지(diary/photo 등) 유지 ──
    if (editCourseId) {
      const existing = loadCourses().find(c => c.id === editCourseId)
      const patch: Partial<SavedCourse> = {
        title:            title.trim(),
        distanceKm:       parseFloat(dist.toFixed(1)),
        durationMin:      Math.round((dist / 60) * 60),
        gpxPoints:        gpxPts,
        gpxXml:           buildGpxXml(gpxPts),
        plannerWaypoints: newWaypoints,
      }
      updateCourse(editCourseId, patch)
      // 서버 PATCH
      updateMyCourse(editCourseId, patch).then(ok => {
        if (!ok && existing) {
          insertMyCourse({ ...existing, ...patch }).catch(e =>
            console.warn('[RoutePlanner] 수정 서버 저장 실패:', e)
          )
        }
      })
      setDone(true)
      setTimeout(() => navigate('/my-routes', { replace: true }), 1_200)
      return
    }

    // ── 신규 저장 ──────────────────────────────────────────────────────────
    const course: SavedCourse = {
      id:               crypto.randomUUID(),
      title:            title.trim(),
      distanceKm:       parseFloat(dist.toFixed(1)),
      durationMin:      Math.round((dist / 60) * 60),
      gpxPoints:        gpxPts,
      gpxXml:           buildGpxXml(gpxPts),
      createdAt:        new Date().toISOString(),
      isShared:         isPublic,
      communityShared:  isPublic,
      diary:            tip.trim() || undefined,
      plannerWaypoints: newWaypoints,
    }
    saveCourse(course)
    if (isPublic) {
      shareToCommunity(course.id)
      window.dispatchEvent(new CustomEvent('moto:community-updated'))
    }
    insertMyCourse(course).catch(e => console.warn('[RoutePlanner] 서버 저장 실패:', e))
    setDone(true)
    setTimeout(() => navigate('/my-routes', { replace: true }), 1_200)
  }, [canSave, displayPath, points, title, dist, tip, navigate, editCourseId])

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative" style={{ height: '100dvh', overflow: 'hidden' }}>

      {/* ── 카카오맵 ── */}
      <PlannerMap
        points={points}
        routePath={displayPath}
        locked={locked}
        deleteTargetOpen={!!deleteTarget}
        onAddPoint={handleAddPoint}
        onMarkerTap={handleMarkerTap}
        onLongPress={handleLongPress}
        onDismissBubble={handleDismissBubble}
        currentUserPos={importUserPos ?? undefined}
        panTo={mapPanTo}
        previewPos={previewPos}
        initialFitPoints={
          isImportMode && importedWaypoints?.length
            ? (importUserPos ? [importUserPos, ...importedWaypoints] : importedWaypoints)
            : undefined
        }
      />

      {/* ── 로드뷰 팝업 ── */}
      <AnimatePresence>
        {roadviewPos && (
          <RoadviewModal
            lat={roadviewPos.lat}
            lng={roadviewPos.lng}
            onClose={() => setRoadviewPos(null)}
          />
        )}
      </AnimatePresence>

      {/* ── 마커 삭제/연결 팝업 ── */}
      <DeleteBubble
        target={deleteTarget}
        onDelete={handleDelete}
        onConnect={isImportMode && importUserPos ? handleConnectFromHere : undefined}
      />

      {/* ── CONFIRM 오버레이 ── */}
      {locked && (
        <div className="absolute inset-0 z-[900] bg-black/20 backdrop-blur-[1px]" />
      )}

      {/* ── 상단 헤더 ── */}
      <PlannerHeader
        locked={locked}
        hasPoints={points.length > 0}
        dist={dist}
        pointsCount={points.length}
        onBack={() => navigate(-1)}
        onUndo={handleUndo}
        onClear={handleClear}
      />

      {/* ── 경로 계산 중 인디케이터 ── */}
      <AnimatePresence>
        {routing && (
          <motion.div
            className="absolute inset-x-0 bottom-28 z-[1000] flex justify-center"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 backdrop-blur-md">
              <Loader2 size={13} strokeWidth={2} className="animate-spin text-[#FF5A00]" />
              <span className="text-[11px] font-light text-white/60">도로 경로 계산 중…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── DRAW: 하단 버튼 영역 (경유지 목록 + 코스 확정) ── */}
      <AnimatePresence>
        {!locked && (
          <motion.div
            key="draw-btns"
            className="absolute inset-x-0 bottom-10 z-[1000] flex items-center justify-center gap-2 px-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            {/* 장소 검색 버튼 */}
            <button
              onClick={() => setShowSearch(true)}
              className="flex shrink-0 items-center gap-1 rounded-2xl border border-white/15 bg-slate-950/80 px-3 py-3 text-xs font-semibold text-white/70 shadow-xl backdrop-blur-md active:opacity-70"
            >
              <Search size={13} strokeWidth={1.8} className="text-white/60" />
              검색
            </button>

            {/* 경유지 목록 버튼 — 경유지가 1개 이상일 때 표시 */}
            {points.length >= 1 && (
              <button
                onClick={() => setShowWpList(v => !v)}
                className="flex shrink-0 items-center gap-1 rounded-2xl border border-white/15 bg-slate-950/80 px-3 py-3 text-xs font-semibold text-white/70 shadow-xl backdrop-blur-md active:opacity-70"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FF5A00] text-[9px] font-bold text-white">
                  {points.length}
                </span>
                목록
              </button>
            )}

            {/* 코스 확정 버튼 */}
            {points.length >= 2 && (
              <button
                onClick={handleConfirm}
                disabled={routing}
                className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-[#FF5A00] px-4 py-3 text-xs font-bold text-white shadow-xl shadow-orange-900/40 active:opacity-80 disabled:opacity-60"
              >
                <PenLine size={13} strokeWidth={2} />
                코스 확정
                <span className="rounded-full bg-slate-950/20 px-1.5 py-0.5 text-[9px] font-bold">
                  {dist.toFixed(1)} km
                </span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 경유지 목록 패널 ── */}
      <WaypointListSheet
        points={points}
        pointNames={pointNames}
        isOpen={showWpList && !locked}
        onClose={() => setShowWpList(false)}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
        onDelete={idx => { handleDelete(idx); if (points.length <= 1) setShowWpList(false) }}
      />

      {/* ── 장소 검색 패널 ── */}
      <PlaceSearchPanel
        isOpen={showSearch && !locked}
        onClose={() => { setShowSearch(false); setPreviewPos(undefined) }}
        onAdd={handleAddFromSearch}
        onPreview={(lat, lng) => { setMapPanTo({ lat, lng }); setPreviewPos({ lat, lng }) }}
      />

      {/* ── CONFIRM: 정보 입력 패널 ── */}
      <AnimatePresence>
        {locked && (
          <ConfirmPanel
            points={points}
            dist={dist}
            title={title}
            tip={tip}
            done={done}
            canSave={canSave}
            isEditMode={!!editCourseId}
            onReEdit={() => setStage('DRAW')}
            onTitleChange={setTitle}
            onTipChange={setTip}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      {/* ── 종료 확인 모달 ── */}
      {showExitConfirm && (
        <>
          <div
            className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm"
            onClick={cancelExit}
          />
          <div className="fixed inset-x-0 bottom-0 z-[2010]">
            <div className="mx-auto max-w-sm rounded-t-3xl border border-white/10 bg-[#161B26]/98 px-5 pt-5 pb-10 backdrop-blur-xl">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
              <p className="mb-1 text-center text-sm font-bold text-white">경로 작성을 종료할까요?</p>
              <p className="mb-6 text-center text-xs font-light text-white/40">작성 중인 경로는 저장되지 않습니다</p>
              <div className="flex gap-2">
                <button
                  onClick={cancelExit}
                  className="flex flex-1 items-center justify-center rounded-3xl border border-white/10 bg-white/5 py-4 text-sm font-bold text-white/70 active:opacity-70"
                >
                  계속하기
                </button>
                <button
                  onClick={confirmExit}
                  className="flex flex-[1.4] items-center justify-center rounded-3xl bg-rose-500/80 py-4 text-sm font-bold text-white active:opacity-80"
                >
                  종료
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
