// DeleteModal.tsx — 경로 삭제 확인 모달
import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { useModalBackButton } from '../../../hooks/useModalBackButton'

interface Props {
  title: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteModal({ title, onConfirm, onCancel }: Props) {
  const [open, setOpen] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOpen(true), 16); return () => clearTimeout(t) }, [])
  useModalBackButton(true, onCancel)

  return (
    <>
      <div
        className={`fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onCancel}
      />
      <div className={`fixed bottom-0 left-0 right-0 z-[201] transition-transform duration-500 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="mx-auto max-w-sm rounded-t-3xl bg-[#161B26]/98 px-6 pt-5 pb-12 backdrop-blur-xl">
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/15" />
          <div className="mb-4 flex items-center gap-2">
            <Trash2 size={13} strokeWidth={1.5} className="text-red-400" />
            <span className="text-[10px] font-light uppercase tracking-widest text-white/30">Delete Record</span>
          </div>
          <p className="mb-2 text-[16px] font-bold text-white">주행 기록 삭제</p>
          {/* 코스 이름 강조 박스 */}
          <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5">
            <p className="text-[10px] font-light text-white/30">삭제할 코스</p>
            <p className="mt-0.5 text-[14px] font-bold text-white">{title}</p>
          </div>
          <p className="mb-6 text-[12px] font-light leading-relaxed text-white/35">
            삭제 후 복구할 수 없어요.
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={onCancel}
              className="flex flex-1 items-center justify-center rounded-2xl py-3.5 text-sm font-semibold text-white/60 active:opacity-70"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              className="flex flex-[1.2] items-center justify-center gap-1.5 rounded-2xl py-3.5 text-sm font-bold text-white active:opacity-80"
              style={{ background: 'rgba(239,68,68,0.80)' }}
            >
              <Trash2 size={14} strokeWidth={2} />
              삭제
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
