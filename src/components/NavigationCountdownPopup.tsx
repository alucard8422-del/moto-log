// NavigationCountdownPopup.tsx — 3초 세이프티 전환 팝업
import { useEffect, useRef, useState } from 'react'
import { Navigation, X } from 'lucide-react'

interface Props {
  isOpen: boolean
  naviLabel: string   // "T map" | "카카오내비" | "아틀란"
  onLaunch: () => void
  onCancel: () => void
}

const TOTAL = 3

export default function NavigationCountdownPopup({ isOpen, naviLabel, onLaunch, onCancel }: Props) {
  const [count, setCount] = useState(TOTAL)
  const onLaunchRef = useRef(onLaunch)
  onLaunchRef.current = onLaunch

  useEffect(() => {
    if (!isOpen) {
      setCount(TOTAL)
      return
    }

    setCount(TOTAL)
    const interval = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(interval)
          // 다음 틱에서 실행 (setState 중 상태 변경 방지)
          setTimeout(() => onLaunchRef.current(), 0)
          return 0
        }
        return c - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen])

  // 원형 프로그레스 계산
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const progress = (count / TOTAL) * circumference

  return (
    <>
      {/* 백드롭 */}
      <div
        className={`fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* 팝업 본체 */}
      <div
        className={`fixed inset-0 z-[70] flex items-center justify-center transition-all duration-300 ${
          isOpen ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-95'
        }`}
      >
        <div className="flex w-72 flex-col items-center rounded-3xl border border-white/10 bg-[#111622]/98 px-8 py-8 backdrop-blur-xl">

          {/* 아이콘 */}
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-400/10">
            <Navigation size={24} strokeWidth={1.5} className="text-teal-400" />
          </div>

          {/* 헤더 문구 */}
          <p className="mb-1 text-[10px] font-light uppercase tracking-widest text-white/30">
            내비게이션으로 이동합니다
          </p>
          <p className="mb-5 text-sm font-bold text-white">{naviLabel}</p>

          {/* SVG 원형 카운트다운 */}
          <div className="relative mb-5 flex h-24 w-24 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 88 88">
              {/* 트랙 */}
              <circle
                cx="44" cy="44" r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="4"
              />
              {/* 진행 */}
              <circle
                cx="44" cy="44" r={radius}
                fill="none"
                stroke="#2DD4BF"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
                style={{ transition: 'stroke-dashoffset 0.9s linear', filter: 'drop-shadow(0 0 6px #2DD4BF)' }}
              />
            </svg>
            {/* 숫자 */}
            <span
              className="text-4xl font-bold leading-none text-[#2DD4BF]"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                textShadow: '0 0 16px rgba(45,212,191,0.7)',
              }}
            >
              {count}
            </span>
          </div>

          <p className="mb-6 text-[10px] font-light text-white/25">
            잠시 후 자동으로 전환됩니다
          </p>

          {/* 취소 버튼 */}
          <button
            onClick={onCancel}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-light text-white/50 transition-opacity active:opacity-60"
          >
            <X size={14} strokeWidth={1.5} />
            취소 — 지도로 돌아가기
          </button>
        </div>
      </div>
    </>
  )
}
