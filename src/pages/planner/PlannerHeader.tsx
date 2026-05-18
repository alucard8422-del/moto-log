// PlannerHeader.tsx — 경로 작성 페이지 상단 바
// 뒤로가기 · 제목 · 거리 뱃지 · 실행취소(Undo) · 전체삭제(Clear)

import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Trash2, CornerDownLeft } from 'lucide-react'

interface Props {
  locked:      boolean   // CONFIRM 단계 여부
  hasPoints:   boolean   // 포인트가 1개 이상인지
  dist:        number    // 총 거리 (km)
  pointsCount: number
  onBack:      () => void
  onUndo:      () => void
  onClear:     () => void
}

export default function PlannerHeader({
  locked, hasPoints, dist, pointsCount,
  onBack, onUndo, onClear,
}: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-center justify-between px-4 pt-4">
      {/* ── 뒤로가기 ── */}
      <button
        onClick={onBack}
        className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 backdrop-blur-md active:opacity-60"
      >
        <ArrowLeft size={17} strokeWidth={1.5} className="text-white/80" />
      </button>

      {/* ── 중앙 제목 + 거리 뱃지 ── */}
      <div className="pointer-events-none flex flex-col items-center gap-1">
        <span className="rounded-full border border-white/10 bg-slate-950/80 px-4 py-1.5 text-xs font-bold tracking-wider text-white/80 backdrop-blur-md">
          {locked ? '코스 정보 입력' : '경로 작성'}
        </span>
        {pointsCount >= 2 && (
          <span className="rounded-full bg-teal-400/20 px-3 py-1 text-[10px] font-bold text-teal-400">
            {dist.toFixed(1)} km · {pointsCount}개 포인트
          </span>
        )}
      </div>

      {/* ── 우측 버튼 ── */}
      <div className="pointer-events-auto flex gap-2">
        <AnimatePresence>
          {/* DRAW 단계 + 포인트 있을 때: Undo · Clear */}
          {!locked && hasPoints && (
            <>
              <motion.button
                key="undo"
                onClick={onUndo}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 backdrop-blur-md active:opacity-60"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              >
                <CornerDownLeft size={15} strokeWidth={1.5} className="text-white/60" />
              </motion.button>

              <motion.button
                key="clear"
                onClick={onClear}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 backdrop-blur-md active:opacity-60"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24, delay: 0.05 }}
              >
                <Trash2 size={15} strokeWidth={1.5} className="text-rose-400" />
              </motion.button>
            </>
          )}
        </AnimatePresence>

        {/* CONFIRM 단계: Clear 만 */}
        {locked && (
          <button
            onClick={onClear}
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 backdrop-blur-md active:opacity-60"
          >
            <Trash2 size={15} strokeWidth={1.5} className="text-rose-400" />
          </button>
        )}
      </div>
    </div>
  )
}
