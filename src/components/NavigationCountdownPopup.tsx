// NavigationCountdownPopup.tsx — 3초 세이프티 전환 팝업
// 버그 수정: requestAnimationFrame으로 숫자·링 게이지를 동일 타임소스에서 파생
// → CSS transition 없이 60fps 프레임 단위로 완벽 동기화
import { useEffect, useRef, useState } from 'react'
import { Navigation, X } from 'lucide-react'

interface Props {
  isOpen: boolean
  naviLabel: string
  onLaunch: () => void
  onCancel: () => void
}

const TOTAL        = 3
const RADIUS       = 36
const CIRCUMFERENCE = 2 * Math.PI * RADIUS   // ≈ 226.19

export default function NavigationCountdownPopup({ isOpen, naviLabel, onLaunch, onCancel }: Props) {
  // count: 표시 숫자 (3→2→1→0)
  // offset: strokeDashoffset (0=꽉 참 → CIRCUMFERENCE=빔)
  // 둘 다 동일한 elapsed에서 파생 → 완전 동기화
  const [count,  setCount]  = useState(TOTAL)
  const [offset, setOffset] = useState(0)

  const onLaunchRef = useRef(onLaunch)
  onLaunchRef.current = onLaunch

  const startRef = useRef<number | null>(null)   // RAF 시작 타임스탬프
  const rafRef   = useRef<number | null>(null)
  const firedRef = useRef(false)                 // onLaunch 중복 실행 방지

  useEffect(() => {
    if (!isOpen) {
      // ── 닫힘: RAF 자원 해제만 — setState 금지 (페이드아웃 중 "3" 잔상 방지)
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      startRef.current = null
      firedRef.current = false
      return
    }

    // ── 열림: 상태 리셋 후 RAF 루프 시작
    setCount(TOTAL)
    setOffset(0)
    startRef.current = null
    firedRef.current = false

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now

      const elapsed   = (now - startRef.current) / 1000
      const remaining = Math.max(0, TOTAL - elapsed)

      const newCount  = Math.ceil(remaining)                        // 3→2→1→0 (이산)
      const newOffset = ((TOTAL - remaining) / TOTAL) * CIRCUMFERENCE // 연속 선형

      if (remaining <= 0) {
        // 정확히 0: 마지막 프레임 렌더 후 onLaunch — 이후 setState 없음
        setCount(0)
        setOffset(CIRCUMFERENCE)
        if (!firedRef.current) {
          firedRef.current = true
          setTimeout(() => onLaunchRef.current(), 0)
        }
        return   // RAF 루프 종료, setState 추가 호출 없음
      }

      setCount(newCount)
      setOffset(newOffset)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    // 클린업: RAF만 해제 — 상태 리셋은 위 !isOpen 브랜치에서만 수행
    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    }
  }, [isOpen])

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
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF5A00]/10">
            <Navigation size={24} strokeWidth={1.5} className="text-[#FF5A00]" />
          </div>

          {/* 헤더 */}
          <p className="mb-1 text-[10px] font-light uppercase tracking-widest text-white/30">
            내비게이션으로 이동합니다
          </p>
          <p className="mb-5 text-sm font-bold text-white">{naviLabel}</p>

          {/* SVG 원형 카운트다운 */}
          <div className="relative mb-5 flex h-24 w-24 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 88 88">
              {/* 트랙 */}
              <circle
                cx="44" cy="44" r={RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="4"
              />
              {/* 게이지 — transition 없음, RAF가 60fps로 직접 제어 */}
              <circle
                cx="44" cy="44" r={RADIUS}
                fill="none"
                stroke="#FF5A00"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={offset}
                style={{ filter: 'drop-shadow(0 0 6px #FF5A00)' }}
              />
            </svg>

            {/* 숫자 — offset과 동일 elapsed에서 파생 → 자로 잰 듯 동기화 */}
            <span
              className="text-4xl font-bold leading-none text-[#FF5A00]"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                textShadow: '0 0 16px rgba(255,90,0,0.7)',
              }}
            >
              {count}
            </span>
          </div>

          <p className="mb-6 text-[10px] font-light text-white/25">
            잠시 후 자동으로 전환됩니다
          </p>

          {/* 취소 */}
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
