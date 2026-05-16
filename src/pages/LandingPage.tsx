import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, MapPin, Navigation } from 'lucide-react'
import AuthModal from '../components/AuthModal'

const BG_IMAGE_URL =
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80'

export default function LandingPage() {
  const navigate = useNavigate()
  const [authOpen, setAuthOpen] = useState(false)

  const handleStart = () => {
    console.log('[LandingPage] 시작하기 클릭 → 로그인 모달 오픈')
    setAuthOpen(true)
  }

  const handleExplore = () => {
    console.log('[LandingPage] 코스 둘러보기 클릭 → /courses 이동')
    navigate('/courses')
  }

  return (
    <>
    <div className="relative min-h-svh w-full overflow-hidden">
      {/* 배경 이미지 */}
      <img
        src={BG_IMAGE_URL}
        alt="scenic road background"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* 다크 오버레이 */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" />

      {/* 콘텐츠 레이어 */}
      <div className="relative z-10 flex min-h-svh flex-col">
        {/* 상단 로고 */}
        <header className="flex items-center justify-between px-6 pt-12">
          <div className="flex items-center gap-2">
            <Navigation size={20} strokeWidth={1.5} className="text-teal-400" />
            <span className="text-sm font-light tracking-[0.2em] text-white/60 uppercase">
              Moto Log
            </span>
          </div>
        </header>

        {/* 메인 히어로 */}
        <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-1.5">
            <MapPin size={12} strokeWidth={1.5} className="text-teal-400" />
            <span className="text-xs font-light text-white/50">
              Premium Midnight Drive
            </span>
          </div>

          <h1 className="mb-4 text-5xl font-bold leading-tight tracking-tight text-white">
            당신의 루트를
            <br />
            <span className="text-teal-400">기록하세요</span>
          </h1>

          <p className="mb-10 max-w-xs text-base font-light leading-relaxed text-white/50">
            오토바이 라이더를 위한 투어 로그.
            <br />
            달린 길, 만난 풍경, 공유된 감동.
          </p>

          {/* CTA 버튼 */}
          <div className="flex w-full max-w-xs flex-col gap-3">
            <button
              onClick={handleStart}
              className="flex items-center justify-center gap-2 rounded-3xl bg-teal-400 px-6 py-4 font-bold text-slate-950 transition-opacity active:opacity-80"
            >
              지금 시작하기
              <ChevronRight size={18} strokeWidth={1.5} />
            </button>

            <button
              onClick={handleExplore}
              className="flex items-center justify-center gap-2 rounded-3xl border border-white/5 bg-white/5 px-6 py-4 font-light text-white/70 transition-opacity active:opacity-80"
            >
              코스 둘러보기
            </button>
          </div>
        </main>

        {/* 하단 통계 */}
        <footer className="px-6 pb-12">
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: '2,400+', label: '등록 코스' },
              { value: '18K', label: '라이더' },
              { value: '4.9', label: '평점' },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="rounded-3xl border border-white/5 bg-white/5 py-4 text-center"
              >
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="mt-0.5 text-xs font-light text-white/40">{label}</p>
              </div>
            ))}
          </div>
        </footer>
      </div>
    </div>

    {/* 로그인 모달 */}
    {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  )
}
