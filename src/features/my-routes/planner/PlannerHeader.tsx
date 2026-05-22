// PlannerHeader.tsx — 경로 작성 페이지 상단 바
// Frosted glass 스타일, 거리 뱃지 화면 중앙 고정

import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Trash2, CornerDownLeft } from 'lucide-react'

interface Props {
  locked:      boolean
  hasPoints:   boolean
  dist:        number
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
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] px-4 pt-4">
      <div className="relative flex h-10 items-center">

        {/* ── 뒤로가기 (좌측 고정) ── */}
        <button
          onClick={onBack}
          className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-xl active:opacity-60"
        >
          <ArrowLeft size={17} strokeWidth={2} className="text-gray-900" />
        </button>

        {/* ── 거리 뱃지 (화면 정중앙 — absolute 로 고정) ── */}
        <div className="pointer-events-none absolute inset-x-0 flex justify-center">
          <AnimatePresence>
            {pointsCount >= 2 && (
              <motion.span
                key="dist-badge"
                className="rounded-full bg-white/15 px-3.5 py-1.5 text-[11px] font-bold text-gray-900 backdrop-blur-xl"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              >
                {dist.toFixed(1)} km · {pointsCount}개 포인트
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* ── 우측 버튼들 (우측 고정) ── */}
        <div className="pointer-events-auto ml-auto flex shrink-0 gap-2">
          <AnimatePresence>
            {!locked && hasPoints && (
              <>
                <motion.button
                  key="undo"
                  onClick={onUndo}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-xl active:opacity-60"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                >
                  <CornerDownLeft size={15} strokeWidth={2} className="text-gray-700" />
                </motion.button>

                <motion.button
                  key="clear"
                  onClick={onClear}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/15 backdrop-blur-xl active:opacity-60"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24, delay: 0.05 }}
                >
                  <Trash2 size={15} strokeWidth={2} className="text-rose-500" />
                </motion.button>
              </>
            )}
          </AnimatePresence>

          {locked && (
            <button
              onClick={onClear}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/15 backdrop-blur-xl active:opacity-60"
            >
              <Trash2 size={15} strokeWidth={2} className="text-rose-500" />
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
