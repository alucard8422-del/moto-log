// DeleteModal.tsx — 경로 삭제 확인 모달
import { AlertTriangle, X, Trash2 } from 'lucide-react'
import { useModalBackButton } from '../../../hooks/useModalBackButton'

interface Props {
  title: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteModal({ title, onConfirm, onCancel }: Props) {
  useModalBackButton(true, onCancel)

  return (
    <>
      <div
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className="fixed inset-x-4 top-1/2 z-[201] -translate-y-1/2 rounded-3xl p-6"
        style={{ background: '#111622', border: '1px solid rgba(255,255,255,0.10)', maxWidth: 360, margin: '0 auto' }}
      >
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full active:opacity-60"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <X size={15} strokeWidth={1.5} className="text-white/50" />
        </button>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(239,68,68,0.12)' }}>
          <AlertTriangle size={22} strokeWidth={1.5} className="text-red-400" />
        </div>
        <p className="mb-1.5 text-[16px] font-bold text-white">주행 기록 삭제</p>
        <p className="mb-6 text-[13px] font-light leading-relaxed text-white/45">
          '{title}' 기록을 삭제합니다.<br />삭제 후 복구할 수 없어요.
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
    </>
  )
}
