// DeleteBubble.tsx — 마커 탭 시 나타나는 삭제 말풍선 (Portal)
//
// 사용법
//   <DeleteBubble target={deleteTarget} onDelete={handleDelete} />
//
// target 이 null 이면 숨김, null 이 아니면 해당 마커 위에 말풍선 표시
// 말풍선 닫기(onDismiss)는 부모(RoutePlanner)가 빈 곳 탭을 감지해서 처리

import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Link } from 'lucide-react'
import type { DeleteTarget } from './plannerUtils'

interface Props {
  target:     DeleteTarget | null
  onDelete:   (idx: number) => void
  onConnect?: (idx: number) => void  // 임포트 모드: 현재 위치 → 이 경유지 연결
}

export default function DeleteBubble({ target, onDelete, onConnect }: Props) {
  return createPortal(
    <AnimatePresence>
      {target && (
        <motion.div
          key={`bubble-${target.idx}`}
          style={{
            position:  'fixed',
            left:      target.screenX,
            top:       target.screenY,
            transform: 'translate(-50%, -50%)',
            zIndex:    2500,
            pointerEvents: 'auto',
          }}
          initial={{ opacity: 0, scale: 0.75 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.75 }}
          transition={{ type: 'spring', stiffness: 460, damping: 28 }}
        >
          <div className="flex gap-2">
            {onConnect && (
              <button
                onClick={() => onConnect(target.idx)}
                className="flex items-center gap-2 rounded-2xl border border-[#FF5A00]/30 bg-slate-950/95 px-5 py-2.5 shadow-2xl shadow-black/60 backdrop-blur-md active:opacity-70"
              >
                <Link size={13} strokeWidth={2.5} style={{ color: '#FF5A00' }} />
                <span className="text-sm font-bold" style={{ color: '#FF5A00' }}>여기서 연결</span>
              </button>
            )}
            <button
              onClick={() => onDelete(target.idx)}
              className="flex items-center gap-2 rounded-2xl border border-rose-500/25 bg-slate-950/95 px-5 py-2.5 shadow-2xl shadow-black/60 backdrop-blur-md active:opacity-70"
            >
              <Trash2 size={13} strokeWidth={2.5} className="text-rose-400" />
              <span className="text-sm font-bold text-rose-400">삭제</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
