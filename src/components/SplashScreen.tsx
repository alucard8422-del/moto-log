// SplashScreen.tsx
// 영상 파일: public/splash.mp4 에 넣으면 자동 재생
// 영상 없으면 그라디언트 배경으로 대체, 4초 후 자동 전환

import { useEffect, useRef, useState } from 'react'

interface Props {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: Props) {
  const [fading, setFading]     = useState(false)
  const calledRef               = useRef(false)

  const finish = () => {
    if (calledRef.current) return
    calledRef.current = true
    setFading(true)
    setTimeout(onComplete, 700)
  }

  useEffect(() => {
    // 영상 없거나 길어도 4.5초 후 강제 전환
    const timer = setTimeout(finish, 4500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.7s ease-out' }}
    >
      {/* ── 배경 영상 ── */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/splash.mp4"
        autoPlay
        muted
        playsInline
        onEnded={finish}
      />

      {/* ── 영상 없을 때 폴백 그라디언트 ── */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(160deg, #1C0A00 0%, #431407 35%, #7C2D12 65%, #F97316 100%)',
        }}
      />

      {/* ── 오버레이 ── */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.45) 100%)' }}
      />

      {/* ── 로고 ── */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-2">
        <h1
          style={{
            fontSize: 44,
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-0.03em',
            textShadow: '0 2px 20px rgba(0,0,0,0.3)',
          }}
        >
          MotoLog
        </h1>
        <p
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.65)',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
          }}
        >
          Your roads. Your story.
        </p>
      </div>

      {/* ── 하단 진행 바 ── */}
      <div className="absolute bottom-14 left-1/2 -translate-x-1/2">
        <div
          style={{
            width: 48,
            height: 2,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.25)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              background: 'rgba(255,255,255,0.85)',
              animation: 'splash-bar 4.5s linear forwards',
            }}
          />
        </div>
      </div>
    </div>
  )
}
