// Layout.tsx — 공통 헤더 + 탭바
import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { CircleDot, Route, Compass, Warehouse, User } from 'lucide-react'
import FuelCompleteSheet from './FuelCompleteSheet'
import DriveSessionOverlay from './DriveSessionOverlay'

const TAB_ITEMS = [
  { path: '/map',       icon: CircleDot, label: '기록'     },
  { path: '/my-routes', icon: Route,     label: '내 경로'  },
  { path: '/courses',   icon: Compass,   label: '코스'     },
  { path: '/garage',    icon: Warehouse, label: '차고'     },
  { path: '/profile',   icon: User,      label: '프로필'   },
] as const

const TAB_PATHS  = TAB_ITEMS.map(t => t.path)
const LAST_TAB_KEY = 'moto:lastTab'

// 브랜드 컬러
const ORANGE = '#F97316'
const ORANGE_BG = '#FFF3E8'

export default function Layout() {
  const navigate    = useNavigate()
  const { pathname } = useLocation()
  const isMapPage   = pathname === '/map'
  const isPlanner   = pathname === '/route-planner'
  const isFullScreen = isMapPage || isPlanner

  useEffect(() => {
    if (TAB_PATHS.includes(pathname as typeof TAB_PATHS[number])) {
      sessionStorage.setItem(LAST_TAB_KEY, pathname)
    }
  }, [pathname])

  return (
    <div className="relative flex min-h-svh flex-col" style={{ backgroundColor: '#FFFBF7' }}>

      {/* ── 헤더 ── */}
      {!isFullScreen && (
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-5 py-4"
          style={{
            backgroundColor: 'rgba(255,251,247,0.92)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {/* 로고 */}
          <div className="flex items-center gap-2">
            {/* 오렌지 닷 */}
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: ORANGE }}
            />
            <span
              style={{
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#1C0A00',
              }}
            >
              MotoLog
            </span>
          </div>

          {/* 우측 — 현재 페이지 이름 */}
          <span style={{ fontSize: 12, color: '#A8A29E', fontWeight: 500 }}>
            {TAB_ITEMS.find(t => t.path === pathname)?.label ?? ''}
          </span>
        </header>
      )}

      {/* ── 메인 컨텐츠 ── */}
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
            backgroundColor: '#FFFFFF',
            boxShadow: '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
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
                {/* 아이콘 + 활성 pill 배경 */}
                <div
                  className="flex items-center justify-center rounded-2xl transition-all duration-200"
                  style={{
                    width: 40,
                    height: 32,
                    backgroundColor: isActive ? ORANGE_BG : 'transparent',
                  }}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.2 : 1.6}
                    style={{ color: isActive ? ORANGE : '#A8A29E' }}
                  />
                </div>
                {/* 라벨 */}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? ORANGE : '#A8A29E',
                    letterSpacing: '0.01em',
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
