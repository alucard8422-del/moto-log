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
import { PenLine, Loader2 }                       from 'lucide-react'

import { saveCourse, shareToCommunity, buildGpxXml, type SavedCourse } from '../../lib/courseStorage'
import { insertMyCourse } from '../../lib/courseService'
import { totalDist, type LatLng }     from './routes/routeUtils'
import { fetchRoute }                 from './planner/routing'
import RoadviewModal                  from '../../components/RoadviewModal'

import PlannerMap    from './planner/PlannerMap'
import PlannerHeader from './planner/PlannerHeader'
import DeleteBubble  from './planner/DeleteBubble'
import ConfirmPanel  from './planner/ConfirmPanel'
import type { DeleteTarget } from './planner/plannerUtils'

export default function RoutePlanner() {
  const navigate = useNavigate()
  const location = useLocation()

  // ── 코스 상세에서 "수정하기"로 진입 시 전달되는 상태 ──────────────────────
  const importState = (location.state ?? {}) as {
    importedWaypoints?: LatLng[]
    userPos?: LatLng
  }
  const importedWaypoints = importState.importedWaypoints
  const importUserPos     = importState.userPos ?? null
  const isImportMode      = !!(importedWaypoints && importedWaypoints.length > 0)

  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const exitingRef = useRef(false)

  // ── 하드웨어 뒤로가기 → 종료 확인 모달 ──────────────────────────────
  useEffect(() => {
    exitingRef.current = false
    window.history.pushState({ routePlannerSentinel: true }, '')
    const onPop = () => {
      if (exitingRef.current) return
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
  const [stage,        setStage]        = useState<'DRAW' | 'CONFIRM'>('DRAW')
  const [title,        setTitle]        = useState('')
  const [tip,          setTip]          = useState('')
  const [done,         setDone]         = useState(false)
  const [roadviewPos,  setRoadviewPos]  = useState<{ lat: number; lng: number } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

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

  // ── 경유지 추가 (최대 20개) ───────────────────────────────────────────────
  const MAX_POINTS = 20
  const handleAddPoint = useCallback((lat: number, lng: number) => {
    if (latestPointsRef.current.length >= MAX_POINTS) return   // 20개 초과 시 무시
    const newPoint: LatLng = { lat, lng }
    const prev = latestPointsRef.current
    latestPointsRef.current = [...prev, newPoint]
    setPoints([...latestPointsRef.current])

    if (prev.length > 0) {
      const fromPt = prev[prev.length - 1]
      const segIdx = prev.length - 1   // segments 배열에서의 인덱스
      setRouting(true)
      fetchRoute(fromPt, newPoint)
        .then(seg => setSegments(segs => {
          const next = [...segs]
          next[segIdx] = seg   // 순서 보장: 인덱스로 직접 삽입
          return next
        }))
        .finally(() => setRouting(false))
    }
  }, [])

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

  // ── 임포트 모드: 공유 경로 경유지 초기 로드 ──────────────────────────────
  useEffect(() => {
    if (!isImportMode || !importedWaypoints || importedWaypoints.length === 0) return
    latestPointsRef.current = importedWaypoints
    setPoints([...importedWaypoints])
    if (importedWaypoints.length < 2) return
    setRouting(true)
    const pairs = importedWaypoints.slice(0, -1).map((from, i) =>
      fetchRoute(from, importedWaypoints[i + 1])
    )
    Promise.all(pairs)
      .then(segs => setSegments(segs))
      .finally(() => setRouting(false))
  }, []) // eslint-disable-line

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
    const now      = Date.now()
    const savePts  = displayPath.length >= 2 ? displayPath : points
    const gpxPts   = savePts.map((p, i) => ({
      lat: p.lat, lng: p.lng, timestamp: now + i * 1_000,
    }))
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
      // 원본 경유지 저장 → 주행하기 네비 딥링크에 사용
      plannerWaypoints: points.map(p => ({ lat: p.lat, lng: p.lng })),
    }
    saveCourse(course)
    if (isPublic) {
      shareToCommunity(course.id)
      window.dispatchEvent(new CustomEvent('moto:community-updated'))
    }
    // 서버 동기화 (fire-and-forget) — 내 경로 이동 후 서버 기준 로드에서 보이도록
    insertMyCourse(course).catch(e => console.warn('[RoutePlanner] 서버 저장 실패:', e))
    setDone(true)
    setTimeout(() => navigate('/my-routes', { replace: true }), 1_200)
  }, [canSave, displayPath, points, title, dist, tip, navigate])

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
        initialFitPoints={
          isImportMode && importUserPos
            ? [importUserPos, ...(importedWaypoints ?? [])]
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


      {/* ── DRAW: 코스 확정 버튼 ── */}
      <AnimatePresence>
        {points.length >= 2 && !locked && (
          <motion.div
            key="confirm-btn"
            className="absolute inset-x-0 bottom-10 z-[1000] flex justify-center px-5"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            <button
              onClick={handleConfirm}
              disabled={routing}
              className="flex items-center gap-2.5 rounded-2xl bg-[#FF5A00] px-8 py-4 text-sm font-bold text-white shadow-xl shadow-orange-900/40 active:opacity-80 disabled:opacity-60"
            >
              <PenLine size={16} strokeWidth={2} />
              코스 확정
              <span className="ml-1 rounded-full bg-slate-950/20 px-2 py-0.5 text-[10px] font-bold">
                {dist.toFixed(1)} km
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
