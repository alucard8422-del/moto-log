// SplashScreen.tsx
// 영상 파일: public/splash.mp4 → 자동 재생, 끝나면 앱 진입
// 영상 로드 실패 시 그라디언트 배경으로 대체, 4.5초 후 강제 전환

import { useEffect, useRef, useState } from 'react'

interface Props {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: Props) {
  const [fading,   setFading]   = useState(false)
  const [videoErr, setVideoErr] = useState(false)
  const calledRef               = useRef(false)

  const finish = () => {
    if (calledRef.current) return
    calledRef.current = true
    setFading(true)
    setTimeout(onComplete, 700)
  }

  useEffect(() => {
    // 영상이 길거나 로드 실패해도 4.5초 후 강제 전환
    const timer = setTimeout(finish, 4500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.7s ease-out' }}
    >
      {/* ── 폴백 그라디언트 (영상 로드 실패 시에만 보임) ── */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(160deg, #1C0A00 0%, #431407 35%, #7C2D12 65%, #F97316 100%)',
          zIndex: 0,
        }}
      />

      {/* ── 배경 영상 (그라디언트 위에 덮음) ── */}
      {!videoErr && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          style={{ zIndex: 1 }}
          src="/splash.mp4"
          autoPlay
          muted
          playsInline
          onEnded={finish}
          onError={() => setVideoErr(true)}
        />
      )}

      {/* ── 하단 다크 그라데이션 오버레이 ── */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.55) 100%)',
          zIndex: 2,
        }}
      />

      {/* ── 로고 ── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-end pb-20"
        style={{ zIndex: 3 }}
      >
        <h1
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-0.03em',
            textShadow: '0 2px 20px rgba(0,0,0,0.5)',
          }}
        >
          MotoLog
        </h1>
        <p
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.6)',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            marginTop: 6,
          }}
        >
          Your roads. Your story.
        </p>

        {/* 진행 바 */}
        <div
          style={{
            marginTop: 28,
            width: 48,
            height: 2,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.2)',
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
