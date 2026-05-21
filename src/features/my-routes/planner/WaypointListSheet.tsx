// WaypointListSheet.tsx — 경유지 목록 + 순서 변경 패널
// 위/아래 버튼으로 경유지 순서 조정, 삭제 가능

import { useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, ChevronDown, Trash2, X, GripVertical, CheckCircle2, MapPin } from 'lucide-react'
import type { LatLng } from '../routes/routeUtils'
import { loadCourses } from '../../../lib/courseStorage'

// ── 방문 여부 판단 ─────────────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function computeVisited(points: LatLng[]): boolean[] {
  const THRESHOLD = 0.5   // 500m 이내
  // 실제 GPX 기록만 (plannerWaypoints 없는 코스)
  const gpxCourses = loadCourses().filter(
    c => !(c.plannerWaypoints?.length) && c.gpxPoints?.length > 0
  )
  return points.map(pt =>
    gpxCourses.some(course =>
      // 5포인트 간격으로 샘플링해서 성능 절약
      course.gpxPoints.some((g, i) =>
        i % 5 === 0 && haversineKm(g.lat, g.lng, pt.lat, pt.lng) < THRESHOLD
      )
    )
  )
}

interface Props {
  points:      LatLng[]
  pointNames:  string[]    // 역지오코딩 주소명
  isOpen:      boolean
  onClose:     () => void
  onMoveUp:    (idx: number) => void
  onMoveDown:  (idx: number) => void
  onDelete:    (idx: number) => void
}

function waypointLabel(idx: number, total: number): string {
  if (idx === 0)           return '출발지'
  if (idx === total - 1)  return '도착지'
  return `경유지 ${idx}`
}

function waypointColor(idx: number, total: number): string {
  if (idx === 0)          return '#22c55e'   // 초록 (출발)
  if (idx === total - 1) return '#FF5A00'   // 오렌지 (도착)
  return '#94a3b8'                           // 회색 (경유)
}

export default function WaypointListSheet({ points, pointNames, isOpen, onClose, onMoveUp, onMoveDown, onDelete }: Props) {
  // ── 방문 여부 (패널 열릴 때 한 번 계산) ──────────────────────────────
  const visitedFlags = useMemo(() => isOpen ? computeVisited(points) : [], [isOpen, points])

  // ── 터치 드래그 reorder ───────────────────────────────────────────────
  const [dragIdx,  setDragIdx]  = useState<number | null>(null)
  const [overIdx,  setOverIdx]  = useState<number | null>(null)
  const listRef    = useRef<HTMLDivElement>(null)
  const startYRef  = useRef(0)
  const itemHeightRef = useRef(56)   // 아이템 높이 (px)

  const handleTouchStart = (e: React.TouchEvent, idx: number) => {
    setDragIdx(idx)
    setOverIdx(idx)
    startYRef.current = e.touches[0].clientY
    // 첫 아이템 높이 측정
    const firstChild = listRef.current?.children[0] as HTMLElement
    if (firstChild) itemHeightRef.current = firstChild.offsetHeight
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragIdx === null) return
    const dy   = e.touches[0].clientY - startYRef.current
    const delta = Math.round(dy / itemHeightRef.current)
    const newOver = Math.max(0, Math.min(points.length - 1, dragIdx + delta))
    setOverIdx(newOver)
  }

  const handleTouchEnd = () => {
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      // 위/아래 방향에 따라 단계적으로 이동 (애니메이션 없이 최종 위치로)
      if (overIdx < dragIdx) {
        for (let i = dragIdx; i > overIdx; i--) onMoveUp(i)
      } else {
        for (let i = dragIdx; i < overIdx; i++) onMoveDown(i)
      }
    }
    setDragIdx(null)
    setOverIdx(null)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 딤 */}
          <motion.div
            className="fixed inset-0 z-[1050] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* 패널 */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[1060] mx-auto max-w-sm"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          >
            <div className="rounded-t-3xl border-t border-white/10 bg-[#0D1117]/97 px-4 pt-3 pb-10 backdrop-blur-2xl">
              {/* 핸들 + 헤더 */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-8 rounded-full bg-white/20" />
                  <span className="text-[11px] font-light uppercase tracking-widest text-white/30">
                    경유지 순서
                  </span>
                </div>
                <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 active:opacity-60">
                  <X size={13} strokeWidth={1.5} className="text-white/40" />
                </button>
              </div>

              <p className="mb-3 text-[10px] font-light text-white/25">
                핸들을 드래그하거나 ↑↓ 버튼으로 순서를 바꾸세요
              </p>

              {/* 경유지 목록 */}
              <div ref={listRef} className="flex max-h-72 flex-col gap-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {points.map((_, idx) => {
                  const label = waypointLabel(idx, points.length)
                  const color = waypointColor(idx, points.length)
                  const isDragging = dragIdx === idx
                  const isOver     = overIdx === idx && dragIdx !== null && dragIdx !== idx

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 rounded-2xl px-3 py-3 transition-all ${
                        isDragging ? 'scale-[0.98] opacity-50 bg-white/10' :
                        isOver     ? 'bg-white/[0.08] ring-1 ring-white/20' :
                        'bg-white/[0.04]'
                      }`}
                    >
                      {/* 드래그 핸들 */}
                      <div
                        className="cursor-grab touch-none select-none p-1 active:cursor-grabbing"
                        onTouchStart={e => handleTouchStart(e, idx)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        <GripVertical size={14} strokeWidth={1.5} className="text-white/20" />
                      </div>

                      {/* 번호 뱃지 */}
                      <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: color }}
                      >
                        {idx + 1}
                      </div>

                      {/* 라벨 + 주소 + 방문 태그 */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] font-semibold text-white/50">{label}</p>
                          {/* 방문 여부 태그 */}
                          {visitedFlags[idx] !== undefined && (
                            visitedFlags[idx] ? (
                              <span className="flex items-center gap-0.5 rounded-full bg-[#FF5A00]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#FF5A00]">
                                <CheckCircle2 size={8} strokeWidth={2.5} />
                                다녀온 곳
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 rounded-full bg-white/6 px-1.5 py-0.5 text-[9px] font-bold text-white/30">
                                <MapPin size={8} strokeWidth={2} />
                                가보지 않은 곳
                              </span>
                            )
                          )}
                        </div>
                        <p className="truncate text-[12px] font-light text-white/80">
                          {pointNames[idx] || '주소 불러오는 중…'}
                        </p>
                      </div>

                      {/* 위/아래 버튼 */}
                      <div className="flex gap-0.5">
                        <button
                          disabled={idx === 0}
                          onClick={() => onMoveUp(idx)}
                          className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/5 active:bg-white/10 disabled:opacity-20"
                        >
                          <ChevronUp size={13} strokeWidth={2} className="text-white/60" />
                        </button>
                        <button
                          disabled={idx === points.length - 1}
                          onClick={() => onMoveDown(idx)}
                          className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/5 active:bg-white/10 disabled:opacity-20"
                        >
                          <ChevronDown size={13} strokeWidth={2} className="text-white/60" />
                        </button>
                      </div>

                      {/* 삭제 */}
                      <button
                        disabled={points.length <= 1}
                        onClick={() => onDelete(idx)}
                        className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/5 active:bg-white/10 disabled:opacity-20"
                      >
                        <Trash2 size={12} strokeWidth={1.8} className="text-rose-400/70" />
                      </button>
                    </div>
                  )
                })}
              </div>

              {points.length === 0 && (
                <p className="py-6 text-center text-[11px] font-light text-white/20">
                  지도를 탭해서 경유지를 추가하세요
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
