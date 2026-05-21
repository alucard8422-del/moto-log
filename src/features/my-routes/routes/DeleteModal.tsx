// DeleteModal.tsx — 경로 삭제 확인 모달
import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  title: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteModal({ title, onConfirm, onCancel }: Props) {
  const [open, setOpen] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOpen(true), 16); return () => clearTimeout(t) }, [])
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <>
      <div
        className={`fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onCancel}
      />
      <div className={`fixed inset-0 z-[80] flex items-center justify-center px-6 transition-all duration-300 ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
        <div className="w-full max-w-xs rounded-3xl border border-white/10 bg-[#161B26]/98 p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10">
            <AlertTriangle size={22} strokeWidth={1.5} className="text-rose-400" />
          </div>
          <p className="mb-1 text-sm font-bold text-white">주행 기록 삭제</p>
          <p className="mb-6 text-xs font-light text-white/40">
            '{title}' 기록을 삭제합니다. 복구할 수 없어요.
          </p>
          <div className="flex gap-2">
            <button onClick={onCancel}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-light text-white/50 active:opacity-60">
              취소
            </button>
            <button onClick={onConfirm}
              className="flex-1 rounded-2xl bg-rose-500/20 py-3 text-sm font-bold text-rose-400 ring-1 ring-rose-500/30 active:opacity-70">
              삭제
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
