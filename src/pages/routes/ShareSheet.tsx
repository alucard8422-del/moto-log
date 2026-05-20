// ShareSheet.tsx — 커뮤니티 공유 확인 시트
import { useState, useEffect } from 'react'
import { Share2 } from 'lucide-react'

interface Props {
  title: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ShareSheet({ title, onConfirm, onCancel }: Props) {
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
      <div className={`fixed inset-x-0 bottom-0 z-[80] transition-transform duration-500 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="mx-auto max-w-sm rounded-t-3xl border border-white/10 bg-[#161B26]/98 px-6 pt-5 pb-10 backdrop-blur-xl">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#FF5A00]/10">
            <Share2 size={20} strokeWidth={1.5} className="text-[#FF5A00]" />
          </div>
          <p className="mb-1 mt-3 text-sm font-bold text-white">추천 코스로 공유하기</p>
          <p className="mb-6 text-xs font-light text-white/40">
            <span className="text-white/70">'{title}'</span> 코스를 커뮤니티에 공유하면<br />
            다른 라이더들의 추천 코스 탭에 등록돼요.
          </p>
          <div className="flex gap-2">
            <button onClick={onCancel}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-light text-white/50 active:opacity-60">
              아니오
            </button>
            <button onClick={onConfirm}
              className="flex-1 rounded-2xl bg-[#FF5A00] py-3.5 text-sm font-bold text-white active:opacity-80">
              예, 공유하기
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
