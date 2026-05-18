// RouteFab.tsx — 내 경로 > 경로 작성 FAB (+ 버튼 → 레이블 슬라이드)
// FAB UI 수정 시 이 파일만 건드리면 됩니다.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'

interface Props {
  onNavigate: () => void
}

export default function RouteFab({ onNavigate }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* 배경 딤 */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="fab-backdrop"
            className="fixed inset-0 z-[48]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB 영역 */}
      <div className="fixed bottom-28 right-5 z-[49] flex items-center gap-3">

        {/* 레이블 칩 */}
        <AnimatePresence>
          {open && (
            <motion.button
              key="fab-label"
              onClick={onNavigate}
              className="flex items-center gap-1.5 rounded-full border border-teal-400/30 bg-slate-950/90 px-4 py-2.5 shadow-lg shadow-black/40 backdrop-blur-md"
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-400" />
              <span className="whitespace-nowrap text-sm font-bold text-teal-400">경로 작성</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* + / × FAB */}
        <motion.button
          onClick={() => setOpen(prev => !prev)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-400 shadow-xl shadow-teal-900/50"
          aria-label={open ? '메뉴 닫기' : '경로 직접 그리기'}
          whileTap={{ scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <motion.span
            className="flex items-center justify-center"
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            <Plus size={24} strokeWidth={2.5} className="text-slate-950" />
          </motion.span>
        </motion.button>
      </div>
    </>
  )
}
