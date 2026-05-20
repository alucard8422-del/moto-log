import { X, Navigation } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

interface AuthModalProps {
  onClose: () => void
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function KakaoLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 3C6.48 3 2 6.69 2 11.25c0 2.91 1.87 5.47 4.7 6.97L5.6 21.5a.5.5 0 0 0 .71.58l4.24-2.83c.47.05.95.08 1.45.08 5.52 0 10-3.69 10-8.25C22 6.69 17.52 3 12 3z"
        fill="#3C1E1E"
        opacity="0.85"
      />
      <path
        d="M12 3C6.48 3 2 6.69 2 11.25c0 2.91 1.87 5.47 4.7 6.97L5.6 21.5a.5.5 0 0 0 .71.58l4.24-2.83c.47.05.95.08 1.45.08 5.52 0 10-3.69 10-8.25C22 6.69 17.52 3 12 3z"
        fill="#FEE500"
        opacity="0.9"
      />
    </svg>
  )
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // 웹: 현재 origin으로 리다이렉트
        // Capacitor 배포 시 → 'io.yourapp://login-callback' 으로 교체
        redirectTo: window.location.origin,
      },
    })
    if (error) console.error('[AuthModal] Google 로그인 실패:', error.message)
  }

  const handleKakao = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) console.error('[AuthModal] Kakao 로그인 실패:', error.message)
  }

  return (
    /* 딤드 배경 — 클릭 시 닫힘 */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      onClick={onClose}
    >
      {/* 백드롭 블러 오버레이 */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />

      {/* 모달 패널 */}
      <div
        className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/80 p-7 shadow-2xl shadow-black/60 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-white/5 bg-white/5 text-white/40 transition-colors hover:text-white/70"
        >
          <X size={14} strokeWidth={1.5} />
        </button>

        {/* 헤더 */}
        <div className="mb-7 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FF5A00]/20 bg-[#FF5A00]/10">
            <Navigation size={20} strokeWidth={1.5} className="text-[#FF5A00]" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-white">모토로그 시작하기</h2>
            <p className="mt-1 text-xs font-light text-white/40">
              소셜 계정으로 간편하게 로그인하세요
            </p>
          </div>
        </div>

        {/* 소셜 로그인 버튼 */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleGoogle}
            className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-sm font-light text-white/80 transition-colors hover:bg-white/10 active:scale-[0.98]"
          >
            <GoogleLogo />
            <span className="flex-1 text-center">구글로 시작하기</span>
          </button>

          <button
            onClick={handleKakao}
            className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-sm font-light text-white/80 transition-colors hover:bg-white/10 active:scale-[0.98]"
          >
            <KakaoLogo />
            <span className="flex-1 text-center">카카오로 시작하기</span>
          </button>
        </div>

        {/* 하단 안내 */}
        <p className="mt-6 text-center text-[11px] font-light leading-relaxed text-white/25">
          로그인 시 서비스 이용약관 및 개인정보처리방침에
          <br />
          동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  )
}
