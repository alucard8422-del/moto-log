// LandingPage.tsx — 소셜 로그인
// 배경: landing-bg-1/2/3.mp4 두 영상 교차 페이드(crossfade) 루프
import { useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

const BG_VIDEOS = [
  '/landing-bg-1.mp4',
  '/landing-bg-2.mp4',
  '/landing-bg-3.mp4',
]

const FADE_MS = 800          // crossfade 길이 (ms)
const FADE_S  = FADE_MS / 1000 // 영상 끝에서 crossfade 시작 시점 (초)

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 3C6.48 3 2 6.69 2 11.25c0 2.91 1.87 5.47 4.7 6.97L5.6 21.5a.5.5 0 0 0 .71.58l4.24-2.83c.47.05.95.08 1.45.08 5.52 0 10-3.69 10-8.25C22 6.69 17.52 3 12 3z" fill="#3C1E1E"/>
    </svg>
  )
}

export default function LandingPage() {
  const [loading,    setLoading]    = useState<'kakao' | 'google' | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [videoErr,   setVideoErr]   = useState(false)
  const [srcIdx,     setSrcIdx]     = useState(0)

  // ── crossfade 제어 ────────────────────────────────────────────────────
  // A/B 두 영상 교대로 사용 — current가 화면에 보이는 쪽
  const [current, _setCurrent]  = useState<'a' | 'b'>('a')
  const currentRef              = useRef<'a' | 'b'>('a')
  const inTransition            = useRef(false)
  const refA                    = useRef<HTMLVideoElement>(null)
  const refB                    = useRef<HTMLVideoElement>(null)

  const setCurrent = (v: 'a' | 'b') => {
    currentRef.current = v
    _setCurrent(v)
  }

  const crossfade = (from: 'a' | 'b') => {
    if (inTransition.current) return
    inTransition.current = true

    const to    = from === 'a' ? 'b' : 'a'
    const toRef = to === 'a' ? refA : refB
    const fromRef = from === 'a' ? refA : refB

    // 다음 영상 처음부터 재생 시작
    if (toRef.current) {
      toRef.current.currentTime = 0
      toRef.current.play().catch(() => {})
    }
    // opacity 전환 (CSS transition이 담당)
    setCurrent(to)

    // fade 완료 후 이전 영상 정지·리셋
    setTimeout(() => {
      if (fromRef.current) {
        fromRef.current.pause()
        fromRef.current.currentTime = 0
      }
      inTransition.current = false
    }, FADE_MS + 100)
  }

  const handleTimeUpdate = (which: 'a' | 'b') => {
    if (inTransition.current || currentRef.current !== which) return
    const v = (which === 'a' ? refA : refB).current
    if (!v || isNaN(v.duration) || v.duration === 0) return
    if (v.currentTime >= v.duration - FADE_S) {
      crossfade(which)
    }
  }

  const handleVideoError = () => {
    if (srcIdx < BG_VIDEOS.length - 1) setSrcIdx(prev => prev + 1)
    else setVideoErr(true)
  }

  // ── 로그인 ────────────────────────────────────────────────────────────
  const loginWith = async (provider: 'kakao' | 'google') => {
    setLoading(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      console.error(`[LandingPage] ${provider} 로그인 실패:`, error.message)
      setLoading(null)
    }
  }

  const videoStyle = (which: 'a' | 'b') => ({
    position:   'absolute' as const,
    inset:      0,
    width:      '100%',
    height:     '100%',
    objectFit:  'cover'  as const,
    zIndex:     1,
    opacity:    !videoReady ? 0 : current === which ? 1 : 0,
    transition: `opacity ${FADE_MS}ms ease-in-out`,
  })

  return (
    <div className="relative overflow-hidden" style={{ height: '100dvh' }}>

      {/* ── 배경 (검정 — 영상 로드 전 표시) ── */}
      <div className="absolute inset-0" style={{ background: '#000', zIndex: 0 }} />

      {/* ── 교차 페이드 영상 A / B ── */}
      {!videoErr && (
        <>
          {/* Video A — 첫 번째로 자동 재생 */}
          <video
            ref={refA}
            key={`a-${srcIdx}`}
            src={BG_VIDEOS[srcIdx]}
            style={videoStyle('a')}
            autoPlay
            muted
            playsInline
            onCanPlay={() => setVideoReady(true)}
            onError={handleVideoError}
            onTimeUpdate={() => handleTimeUpdate('a')}
          />
          {/* Video B — crossfade 타이밍에 play() 호출 */}
          <video
            ref={refB}
            key={`b-${srcIdx}`}
            src={BG_VIDEOS[srcIdx]}
            style={videoStyle('b')}
            muted
            playsInline
            onTimeUpdate={() => handleTimeUpdate('b')}
          />
        </>
      )}

      {/* ── 그라디언트 오버레이 ── */}
      <div
        className="absolute inset-0"
        style={{
          zIndex:     2,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.85) 100%)',
        }}
      />

      {/* ── 상단 로고 ── */}
      <div className="absolute left-0 right-0 top-0 flex justify-center pt-14" style={{ zIndex: 3 }}>
        <span
          className="font-extrabold tracking-tight text-white"
          style={{ fontSize: 26, textShadow: '0 1px 12px rgba(0,0,0,0.5)' }}
        >
          MotoLog
        </span>
      </div>

      {/* ── 하단 콘텐츠 ── */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 pt-8" style={{ zIndex: 3 }}>

        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1"
          style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
          <span className="text-[11px] font-semibold text-white">🏍️ 라이더를 위한 여행 기록</span>
        </div>

        <h1 className="mb-2 text-[30px] font-extrabold leading-tight tracking-tight text-white">
          달린 길이<br />나를 말한다
        </h1>

        <p className="mb-7 text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
          루트를 기록하고, 풍경을 나누고,<br />함께 달린 감동을 간직하세요.
        </p>

        <button
          onClick={() => loginWith('kakao')}
          disabled={!!loading}
          className="mb-3 flex w-full items-center justify-center gap-2.5 rounded-2xl py-4 text-[15px] font-bold active:opacity-80 disabled:opacity-60"
          style={{ background: '#FEE500', color: '#1A1200' }}
        >
          <KakaoIcon />
          {loading === 'kakao' ? '연결 중…' : '카카오로 시작하기'}
        </button>

        <button
          onClick={() => loginWith('google')}
          disabled={!!loading}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl py-4 text-[15px] font-semibold active:opacity-80 disabled:opacity-60"
          style={{
            background:   'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            border:       '1.5px solid rgba(255,255,255,0.30)',
            color:        'white',
          }}
        >
          <GoogleIcon />
          {loading === 'google' ? '연결 중…' : '구글로 시작하기'}
        </button>

        <p className="mt-5 text-center text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
          로그인 시 서비스 이용약관 및 개인정보처리방침에<br />동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  )
}
