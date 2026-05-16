import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Map, Route, User, Bell, Navigation } from 'lucide-react'
import FuelConfirmPopup from './FuelConfirmPopup'
import FuelCompleteSheet from './FuelCompleteSheet'

const TAB_ITEMS = [
  { path: '/map', icon: Map, label: '지도' },
  { path: '/courses', icon: Route, label: '코스' },
  { path: '/profile', icon: User, label: '프로필' },
] as const

export default function Layout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const handleTabPress = (path: string) => {
    navigate(path)
  }

  const handleNotification = () => {
    console.log('[Layout] 알림 버튼 클릭')
  }

  return (
    <div className="relative flex min-h-svh flex-col bg-slate-950">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-slate-950/80 px-5 py-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Navigation size={18} strokeWidth={1.5} className="text-teal-400" />
          <span className="text-sm font-bold tracking-wider text-white">MOTO LOG</span>
        </div>

        <button
          onClick={handleNotification}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/5 bg-white/5"
        >
          <Bell size={16} strokeWidth={1.5} className="text-white/60" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-teal-400" />
        </button>
      </header>

      <main className="flex-1 pb-28">
        <Outlet />
      </main>

      <FuelConfirmPopup />
      <FuelCompleteSheet />

      <nav className="fixed bottom-6 left-1/2 z-20 w-[calc(100%-3rem)] max-w-sm -translate-x-1/2">
        <div className="flex items-center justify-around rounded-3xl border border-white/5 bg-slate-900/80 px-2 py-3 shadow-lg shadow-black/40 backdrop-blur-md">
          {TAB_ITEMS.map(({ path, icon: Icon, label }) => {
            const isActive = pathname === path
            return (
              <button
                key={path}
                onClick={() => handleTabPress(path)}
                className="flex flex-col items-center gap-1 px-5 py-1 transition-opacity active:opacity-60"
              >
                <Icon
                  size={22}
                  strokeWidth={1.5}
                  className={isActive ? 'text-teal-400' : 'text-white/40'}
                />
                <span className={`text-[10px] font-light ${isActive ? 'text-teal-400' : 'text-white/40'}`}>
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
