// RoutePlanner.tsx — 경로 작성 페이지 (상태 오케스트레이터)
//
// 경로 탐색
//  경유지를 찍으면 Valhalla 공개 API 로 도로 경로를 자동 계산합니다.
//  고속도로·자동차전용도로를 강하게 기피하고 일반 도로를 우선 사용합니다.
//  API 실패 시 직선으로 표시합니다.
//
// 마커 상호작용
//  짧은 탭 → 삭제 팝업 / 꾹 누르기(600ms) → 로드뷰

import { useState, useCallback, useMemo, useRef } from 'react'
import { useNavigate }                            from 'react-router-dom'
import { motion, AnimatePresence }                from 'framer-motion'
import { MapPin, PenLine, Loader2 }              from 'lucide-react'

import { saveCourse, shareToCommunity, buildGpxXml, type SavedCourse } from '../lib/courseStorage'
import { totalDist, type LatLng }     from './routes/routeUtils'
import { fetchRoute }                 from './planner/routing'
import RoadviewModal                  from '../components/RoadviewModal'

import PlannerMap    from './planner/PlannerMap'
import PlannerHeader from './planner/PlannerHeader'
import DeleteBubble  from './planner/DeleteBubble'
import ConfirmPanel  from './planner/ConfirmPanel'
import type { DeleteTarget } from './planner/plannerUtils'

export default function RoutePlanner() {
  const navigate = useNavigate()

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

  // ── 경유지 추가 ──────────────────────────────────────────────────────────
  const handleAddPoint = useCallback((lat: number, lng: number) => {
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
      id:              crypto.randomUUID(),
      title:           title.trim(),
      distanceKm:      parseFloat(dist.toFixed(1)),
      durationMin:     Math.round((dist / 60) * 60),
      gpxPoints:       gpxPts,
      gpxXml:          buildGpxXml(gpxPts),
      createdAt:       new Date().toISOString(),
      isShared:        isPublic,
      communityShared: isPublic,
      diary:           tip.trim() || undefined,
    }
    saveCourse(course)
    if (isPublic) {
      shareToCommunity(course.id)
      window.dispatchEvent(new CustomEvent('moto:community-updated'))
    }
    setDone(true)
    setTimeout(() => navigate(-1), 1_200)
  }, [canSave, displayPath, points, title, dist, tip, navigate])

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative" style={{ height: '100svh', overflow: 'hidden' }}>

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

      {/* ── 마커 삭제 팝업 ── */}
      <DeleteBubble target={deleteTarget} onDelete={handleDelete} />

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
            className="absolute left-1/2 top-20 z-[1000] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 backdrop-blur-md"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Loader2 size={13} strokeWidth={2} className="animate-spin text-teal-400" />
            <span className="text-[11px] font-light text-white/60">도로 경로 계산 중…</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DRAW: 빈 화면 안내 ── */}
      <AnimatePresence>
        {points.length === 0 && !locked && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-36 z-[900] flex flex-col items-center gap-3 px-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-teal-400/20 bg-slate-950/80 backdrop-blur-md">
              <MapPin size={20} strokeWidth={1.3} className="text-teal-400" />
            </div>
            <p className="text-center text-sm font-light text-white/50">
              지도를 탭해서 <span className="font-bold text-white/80">경유지 추가</span>
              <br />
              <span className="text-[11px] text-white/30">
                꾹 누르면 로드뷰 · 마커 탭하면 삭제
              </span>
            </p>
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
              className="flex items-center gap-2.5 rounded-2xl bg-teal-400 px-8 py-4 text-sm font-bold text-slate-950 shadow-xl shadow-teal-900/40 active:opacity-80 disabled:opacity-60"
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
    </div>
  )
}
