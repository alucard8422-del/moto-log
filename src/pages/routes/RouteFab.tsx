// RouteFab.tsx — 내 경로 > 경로 작성 FAB
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

      <div className="fixed bottom-28 right-5 z-[49] flex items-center gap-3">

        {/* 레이블 칩 */}
        <AnimatePresence>
          {open && (
            <motion.button
              key="fab-label"
              onClick={onNavigate}
              className="flex items-center gap-2 rounded-full bg-surface px-4 py-2.5"
              style={{
                border:     '1.5px solid color-mix(in srgb, var(--brand) 35%, transparent)',
                boxShadow:  '0 4px 20px color-mix(in srgb, var(--brand) 15%, transparent)',
              }}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
              <span className="whitespace-nowrap text-[14px] font-bold text-brand">경로 작성</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* FAB 버튼 */}
        <motion.button
          onClick={() => setOpen(prev => !prev)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-brand"
          style={{ boxShadow: '0 6px 24px color-mix(in srgb, var(--brand) 40%, transparent)' }}
          whileTap={{ scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <motion.span
            className="flex items-center justify-center"
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            <Plus size={24} strokeWidth={2.5} color="white" />
          </motion.span>
        </motion.button>
      </div>
    </>
  )
}
