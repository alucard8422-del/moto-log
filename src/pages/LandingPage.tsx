// LandingPage.tsx — 스플래시 이후 진입, 소셜 로그인
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=85'

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
  const [loading, setLoading] = useState<'kakao' | 'google' | null>(null)

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

  return (
    <div className="relative overflow-hidden" style={{ height: '100dvh' }}>

      {/* ── 히어로 이미지 ── */}
      <img
        src={HERO_IMAGE}
        alt="mountain road"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: 'center 40%' }}
      />

      {/* ── 그라디언트 오버레이 ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.04) 35%, color-mix(in srgb, var(--bg-app) 70%, transparent) 62%, var(--bg-app) 100%)',
        }}
      />

      {/* ── 상단 로고 ── */}
      <div className="absolute left-0 right-0 top-0 flex justify-center pt-14">
        <span
          className="font-extrabold tracking-tight text-white"
          style={{ fontSize: 26, textShadow: '0 1px 12px rgba(0,0,0,0.35)' }}
        >
          MotoLog
        </span>
      </div>

      {/* ── 하단 콘텐츠 ── */}
      <div className="absolute bottom-0 left-0 right-0 bg-app px-6 pb-10 pt-8">

        {/* 배지 */}
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1">
          <span className="text-[11px] font-semibold" style={{ color: 'var(--brand-text, #C2410C)' }}>
            🏍️ 라이더를 위한 여행 기록
          </span>
        </div>

        {/* 헤드라인 */}
        <h1 className="mb-2 text-[30px] font-extrabold leading-tight tracking-tight text-main">
          달린 길이<br />나를 말한다
        </h1>

        {/* 서브 */}
        <p className="mb-7 text-[14px] leading-relaxed text-sub">
          루트를 기록하고, 풍경을 나누고,<br />함께 달린 감동을 간직하세요.
        </p>

        {/* 카카오 로그인 */}
        <button
          onClick={() => loginWith('kakao')}
          disabled={!!loading}
          className="mb-3 flex w-full items-center justify-center gap-2.5 rounded-2xl py-4 text-[15px] font-bold active:opacity-80 disabled:opacity-60"
          style={{ background: '#FEE500', color: '#1A1200' }}
        >
          <KakaoIcon />
          {loading === 'kakao' ? '연결 중…' : '카카오로 시작하기'}
        </button>

        {/* 구글 로그인 */}
        <button
          onClick={() => loginWith('google')}
          disabled={!!loading}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-surface py-4 text-[15px] font-semibold text-main active:opacity-80 disabled:opacity-60"
          style={{ border: '1.5px solid var(--border)' }}
        >
          <GoogleIcon />
          {loading === 'google' ? '연결 중…' : '구글로 시작하기'}
        </button>

        {/* 약관 */}
        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted">
          로그인 시 서비스 이용약관 및 개인정보처리방침에<br />동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  )
}
