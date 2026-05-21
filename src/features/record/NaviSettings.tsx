// NaviSettings.tsx
import { useState, useEffect } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { NAVI_OPTIONS, type NavigationType } from './types'

interface Props {
  selected: NavigationType
  onSelect: (type: NavigationType) => void
  onSave: () => void
  onClose: () => void
  isFirstLaunch: boolean
}

export default function NaviSettings({
  selected,
  onSelect,
  onSave,
  onClose,
  isFirstLaunch,
}: Props) {
  const [open, setOpen] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOpen(true), 16); return () => clearTimeout(t) }, [])

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={isFirstLaunch ? undefined : onClose}
      />

      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="mx-auto max-w-sm rounded-t-3xl bg-[#161B26]/98 px-5 pt-5 pb-10 backdrop-blur-xl">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/15" />

          <div className="mb-1 text-[10px] font-light uppercase tracking-widest text-white/30">
            내비게이션 설정
          </div>
          <p className="mb-5 text-base font-bold text-white">
            {isFirstLaunch ? '기본 내비게이션을 선택하세요' : '기본 내비게이션 변경'}
          </p>

          <div className="mb-5 flex flex-col gap-2.5">
            {NAVI_OPTIONS.map((opt) => {
              const isSelected = selected === opt.type
              return (
                <button
                  key={opt.type}
                  onClick={() => onSelect(opt.type)}
                  className={`flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all duration-200 ${
                    isSelected
                      ? 'bg-[#FF5A00]/10 ring-1 ring-[#FF5A00]/40'
                      : 'bg-white/5 ring-0'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-black ${
                      isSelected
                        ? 'bg-[#FF5A00] text-white'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {opt.badge}
                  </div>

                  <div className="flex-1 text-left">
                    <p className={`text-sm font-bold ${isSelected ? 'text-[#FF5A00]' : 'text-white/70'}`}>
                      {opt.label}
                    </p>
                    <p className="text-[11px] font-light text-white/30">{opt.label}</p>
                  </div>

                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${
                      isSelected ? 'bg-[#FF5A00]' : 'bg-white/8'
                    }`}
                  >
                    {isSelected && <Check size={11} strokeWidth={2.5} className="text-slate-950" />}
                  </div>
                </button>
              )
            })}
          </div>

          <button
            onClick={onSave}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#FF5A00] py-4 text-sm font-bold text-white transition-opacity active:opacity-80"
          >
            {isFirstLaunch ? '설정 완료' : '변경 저장'}
            <ChevronRight size={15} strokeWidth={2.5} />
          </button>

          {!isFirstLaunch && (
            <button
              onClick={onClose}
              className="mt-3 w-full text-center text-xs font-light text-white/25"
            >
              취소
            </button>
          )}
        </div>
      </div>
    </>
  )
}
