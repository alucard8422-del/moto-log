// RouteFab.tsx — 내 경로 > 경로 작성 FAB
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'

const ORANGE = '#F97316'

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
              className="flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg"
              style={{
                background: '#FFFFFF',
                border: `1.5px solid ${ORANGE}50`,
                boxShadow: '0 4px 20px rgba(249,115,22,0.15)',
              }}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: ORANGE }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: ORANGE, whiteSpace: 'nowrap' }}>
                경로 작성
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* FAB 버튼 */}
        <motion.button
          onClick={() => setOpen(prev => !prev)}
          className="flex h-14 w-14 items-center justify-center rounded-full shadow-xl"
          style={{
            background: ORANGE,
            boxShadow: '0 6px 24px rgba(249,115,22,0.40)',
          }}
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
