// Layout.tsx — 공통 헤더 + 탭바
import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { CircleDot, Route, Compass, Warehouse, User, Navigation, LogOut } from 'lucide-react'
import FuelCompleteSheet from './FuelCompleteSheet'
import DriveSessionOverlay from './DriveSessionOverlay'
import { supabase } from '../lib/supabaseClient'
import { useRideRecord } from '../context/RideRecordContext'

const TAB_ITEMS = [
  { path: '/map',       icon: CircleDot, label: '기록'    },
  { path: '/my-routes', icon: Route,     label: '내 경로' },
  { path: '/courses',   icon: Compass,   label: '코스'    },
  { path: '/garage',    icon: Warehouse, label: '차고'    },
  { path: '/profile',   icon: User,      label: '프로필'  },
] as const

const TAB_PATHS    = TAB_ITEMS.map(t => t.path)
const LAST_TAB_KEY = 'moto:lastTab'

export default function Layout() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  const { status: rideStatus } = useRideRecord()

  const handleLogout = async () => {
    // 스플래시 재생 + 다음 로그인 시 /courses 기본 진입을 위해 세션 초기화
    sessionStorage.removeItem('moto_splash')
    sessionStorage.removeItem(LAST_TAB_KEY)
    await supabase.auth.signOut()
    // AuthListener가 SIGNED_OUT 이벤트로 '/'로 navigate 처리
  }
  const isMapPage    = pathname === '/map'
  const isPlanner    = pathname === '/route-planner'
  const isFullScreen = isMapPage || isPlanner

  useEffect(() => {
    if (TAB_PATHS.includes(pathname as typeof TAB_PATHS[number])) {
      sessionStorage.setItem(LAST_TAB_KEY, pathname)
    }
  }, [pathname])

  return (
    <div className="relative flex min-h-svh flex-col bg-app">

      {/* ── 헤더 ── */}
      {!isFullScreen && (
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-5 py-4"
          style={{
            background:            'var(--glass-bg)',
            backdropFilter:        'var(--glass-blur)',
            WebkitBackdropFilter:  'var(--glass-blur)',
            borderBottom:          '1px solid var(--glass-border)',
          }}
        >
          <div className="flex items-center gap-2">
            <Navigation size={18} strokeWidth={1.5} className="text-brand" />
            <span className="text-[17px] font-extrabold tracking-tight text-main">
              MotoLog
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-opacity active:opacity-60"
            style={{
              background: 'var(--brand)',
              color:      'white',
            }}
          >
            <LogOut size={13} strokeWidth={2} />
            로그아웃
          </button>
        </header>
      )}

      {/* ── 메인 콘텐츠 ── */}
      <main className={isFullScreen ? 'contents' : 'flex-1 pb-28'}>
        <Outlet />
      </main>

      <FuelCompleteSheet />
      <DriveSessionOverlay />

      {/* ── 탭바 ── */}
      <nav
        className={`fixed bottom-5 left-1/2 z-30 -translate-x-1/2 ${isPlanner ? 'hidden' : ''}`}
        style={{ width: 'calc(100% - 40px)', maxWidth: 360 }}
      >
        <div
          className="flex items-center justify-around rounded-[28px] px-1"
          style={{
            height:                84,
            background:            'rgba(255,255,255,0.80)',
            backdropFilter:        'blur(12px)',
            WebkitBackdropFilter:  'blur(12px)',
            border:                '1px solid rgba(0,0,0,0.06)',
            boxShadow:             '0 8px 32px 0 rgba(31,38,135,0.04)',
          }}
        >
          {TAB_ITEMS.map(({ path, icon: Icon, label }) => {
            const isActive   = pathname === path
            const isRecordTab = path === '/map'
            const showDot    = isRecordTab && rideStatus === 'riding' && !isActive
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="relative flex flex-1 flex-col items-center gap-1.5 py-4 transition-opacity active:opacity-60"
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  style={{ color: isActive ? 'var(--tab-active)' : 'var(--tab-inactive)' }}
                />
                <span
                  className="text-[10px]"
                  style={{
                    fontWeight: isActive ? 700 : 400,
                    color:      isActive ? 'var(--tab-active)' : 'var(--tab-inactive)',
                  }}
                >
                  {label}
                </span>
                {/* 기록 중 빨간 점 — 다른 탭에 있을 때만 표시 */}
                {showDot && (
                  <span
                    className="absolute right-[calc(50%-14px)] top-3 h-2 w-2 rounded-full bg-red-500"
                    style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
