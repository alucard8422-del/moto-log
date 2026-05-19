import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { CircleDot, Route, Compass, User, Bell, Navigation, Warehouse } from 'lucide-react'
import FuelCompleteSheet from './FuelCompleteSheet'
import DriveSessionOverlay from './DriveSessionOverlay'

const TAB_ITEMS = [
  { path: '/map',       icon: CircleDot, label: '기록'      },
  { path: '/my-routes', icon: Route,     label: '내 경로'   },
  { path: '/courses',   icon: Compass,   label: '추천 코스'  },
  { path: '/garage',    icon: Warehouse, label: '내 차고'   },
  { path: '/profile',   icon: User,      label: '프로필'    },
] as const

const TAB_PATHS = TAB_ITEMS.map(t => t.path)
const LAST_TAB_KEY = 'moto:lastTab'

export default function Layout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isMapPage      = pathname === '/map'
  const isPlanner      = pathname === '/route-planner'
  // route-planner도 전체화면 — 헤더·탭바 모두 숨김 (ConfirmPanel과 겹침 방지)
  const isFullScreen   = isMapPage || isPlanner

  // 탭 경로에 있을 때마다 sessionStorage에 저장
  // → 앱 전환 후 돌아와도 마지막 탭 기억 (탭 닫으면 자동 초기화)
  useEffect(() => {
    if (TAB_PATHS.includes(pathname as typeof TAB_PATHS[number])) {
      sessionStorage.setItem(LAST_TAB_KEY, pathname)
    }
  }, [pathname])

  return (
    // bg-[var(--bg-app)] — 테마 전환 시 앱 전체 도화지 색 즉시 반영
    <div className="relative flex min-h-svh flex-col" style={{ backgroundColor: 'var(--bg-app)' }}>
      {!isFullScreen && (
        // 헤더: 테마 배경 + 테마 텍스트 + 테마 테두리
        <header
          className="sticky top-0 z-20 flex items-center justify-between border-b px-5 py-4 backdrop-blur-md"
          style={{
            borderColor:     'var(--border-line)',
            backgroundColor: 'color-mix(in srgb, var(--bg-app) 85%, transparent)',
          }}
        >
          <div className="flex items-center gap-2">
            <Navigation size={18} strokeWidth={1.5} className="text-teal-400" />
            <span
              className="text-sm font-bold tracking-wider"
              style={{ color: 'var(--text-main)' }}
            >
              MOTO LOG
            </span>
          </div>
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-full border"
            style={{ borderColor: 'var(--border-line)', backgroundColor: 'var(--bg-surface)' }}
          >
            <Bell size={16} strokeWidth={1.5} style={{ color: 'var(--text-sub)' }} />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-teal-400" />
          </button>
        </header>
      )}

      <main className={isFullScreen ? 'contents' : 'flex-1 pb-28'}>
        <Outlet />
      </main>

      <FuelCompleteSheet />

      {/* 주행 세션 전역 UI (재개 팝업·다음 구간 시트·카운트다운) */}
      <DriveSessionOverlay />

      {/* 하단 탭 바 — 경로 작성 페이지에서는 숨김 (ConfirmPanel과 겹침 방지) */}
      <nav className={`fixed bottom-6 left-1/2 z-30 w-[calc(100%-3rem)] max-w-sm -translate-x-1/2 ${isPlanner ? 'hidden' : ''}`}>
        <div
          className="flex items-center justify-around rounded-3xl border px-2 py-3 shadow-lg shadow-black/20 backdrop-blur-md"
          style={{
            borderColor:     'var(--border-line)',
            backgroundColor: 'color-mix(in srgb, var(--bg-surface) 90%, transparent)',
          }}
        >
          {TAB_ITEMS.map(({ path, icon: Icon, label }) => {
            const isActive = pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-1 px-3 py-1 transition-opacity active:opacity-60"
              >
                <Icon
                  size={22}
                  strokeWidth={1.5}
                  className={isActive ? 'text-teal-400' : undefined}
                  style={isActive ? undefined : { color: 'var(--text-sub)' }}
                />
                <span
                  className={`text-[10px] font-light ${isActive ? 'text-teal-400' : ''}`}
                  style={isActive ? undefined : { color: 'var(--text-sub)' }}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
