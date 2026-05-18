import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { CircleDot, Route, Compass, User, Bell, Navigation, Warehouse } from 'lucide-react'
import FuelCompleteSheet from './FuelCompleteSheet'

const TAB_ITEMS = [
  { path: '/map',       icon: CircleDot, label: '기록'      },
  { path: '/my-routes', icon: Route,     label: '내 경로'   },
  { path: '/courses',   icon: Compass,   label: '추천 코스'  },
  { path: '/garage',    icon: Warehouse, label: '내 차고'   },
  { path: '/profile',   icon: User,      label: '프로필'    },
] as const

export default function Layout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isMapPage = pathname === '/map'

  return (
    // bg-[var(--bg-app)] — 테마 전환 시 앱 전체 도화지 색 즉시 반영
    <div className="relative flex min-h-svh flex-col" style={{ backgroundColor: 'var(--bg-app)' }}>
      {!isMapPage && (
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

      <main className={isMapPage ? 'contents' : 'flex-1 pb-28'}>
        <Outlet />
      </main>

      <FuelCompleteSheet />

      {/* 하단 탭 바 — 5탭 균등 배치 */}
      <nav className="fixed bottom-6 left-1/2 z-30 w-[calc(100%-3rem)] max-w-sm -translate-x-1/2">
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
