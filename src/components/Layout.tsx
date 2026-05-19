// Layout.tsx — 공통 헤더 + 탭바
import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { CircleDot, Route, Compass, Warehouse, User } from 'lucide-react'
import FuelCompleteSheet from './FuelCompleteSheet'
import DriveSessionOverlay from './DriveSessionOverlay'

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
            background:            'rgba(10, 20, 34, 0.75)',
            backdropFilter:        'blur(24px)',
            WebkitBackdropFilter:  'blur(24px)',
            borderBottom:          '1px solid var(--glass-border)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand" />
            <span className="text-[17px] font-extrabold tracking-tight text-main">
              MotoLog
            </span>
          </div>
          <span className="text-xs font-medium text-muted">
            {TAB_ITEMS.find(t => t.path === pathname)?.label ?? ''}
          </span>
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
          className="flex items-center justify-around rounded-[28px] px-1 py-2"
          style={{
            background:            'var(--glass-bg)',
            backdropFilter:        'var(--glass-blur)',
            WebkitBackdropFilter:  'var(--glass-blur)',
            border:                '1px solid var(--glass-border)',
            boxShadow:             'var(--glass-shadow)',
          }}
        >
          {TAB_ITEMS.map(({ path, icon: Icon, label }) => {
            const isActive = pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex flex-1 flex-col items-center gap-1 py-1 transition-opacity active:opacity-60"
              >
                <div
                  className="flex items-center justify-center rounded-2xl transition-all duration-200"
                  style={{
                    width:           40,
                    height:          32,
                    backgroundColor: isActive ? 'var(--brand-soft)' : 'transparent',
                  }}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.2 : 1.6}
                    style={{ color: isActive ? 'var(--brand)' : 'var(--text-muted)' }}
                  />
                </div>
                <span
                  className="text-[10px]"
                  style={{
                    fontWeight: isActive ? 700 : 400,
                    color:      isActive ? 'var(--brand)' : 'var(--text-muted)',
                  }}
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
