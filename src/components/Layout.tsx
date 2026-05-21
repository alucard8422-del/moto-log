// Layout.tsx — 공통 헤더 + 탭바
import { useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { CircleDot, Route, Compass, Warehouse, User, Navigation, LogOut, X, AlertTriangle } from 'lucide-react'
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
  const isRecording  = rideStatus === 'riding'

  // ── 상태 ──────────────────────────────────────────────────────────────────
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [showExitToast,   setShowExitToast]   = useState(false)

  const showExitConfirmRef = useRef(showExitConfirm)
  const exitReadyRef       = useRef(false)   // 뒤로가기 두 번 대기 중
  const exitTimerRef       = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => { showExitConfirmRef.current = showExitConfirm }, [showExitConfirm])

  // ── 탭 페이지 진입 시 뒤로가기 센티넬 + 두 번 종료 로직 ──────────────────
  useEffect(() => {
    if (!TAB_PATHS.includes(pathname as typeof TAB_PATHS[number])) return

    // 센티넬 쌓기
    window.history.pushState({ motoTabSentinel: true }, '')

    const onPop = () => {
      // ① 로그아웃 확인 모달이 열려 있으면 모달만 닫기
      if (showExitConfirmRef.current) {
        setShowExitConfirm(false)
        window.history.pushState({ motoTabSentinel: true }, '')  // 센티넬 복원
        return
      }

      // ② 이미 토스트가 떠 있으면 → 진짜 종료 허용 (센티넬 재push 안 함)
      if (exitReadyRef.current) {
        clearTimeout(exitTimerRef.current)
        exitReadyRef.current = false
        setShowExitToast(false)
        return
      }

      // ③ 첫 번째 뒤로가기 → 토스트 표시 + 센티넬 복원
      window.history.pushState({ motoTabSentinel: true }, '')
      exitReadyRef.current = true
      setShowExitToast(true)
      clearTimeout(exitTimerRef.current)
      exitTimerRef.current = setTimeout(() => {
        exitReadyRef.current = false
        setShowExitToast(false)
      }, 2500)
    }

    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      clearTimeout(exitTimerRef.current)
      exitReadyRef.current = false
      setShowExitToast(false)
    }
  }, [pathname]) // eslint-disable-line

  // ── 로그아웃 ───────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    if (isRecording) { setShowExitConfirm(true); return }
    await doLogout()
  }
  const doLogout = async () => {
    sessionStorage.removeItem('moto_splash')
    sessionStorage.removeItem(LAST_TAB_KEY)
    await supabase.auth.signOut()
  }

  // ── 탭 저장 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (TAB_PATHS.includes(pathname as typeof TAB_PATHS[number])) {
      sessionStorage.setItem(LAST_TAB_KEY, pathname)
    }
  }, [pathname])

  const isMapPage    = pathname === '/map'
  const isPlanner    = pathname === '/route-planner'
  const isFullScreen = isMapPage || isPlanner

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
            <span className="text-[17px] font-extrabold tracking-tight text-main">MotoLog</span>
          </div>

          {/* 기록중 문구 — 헤더 정중앙 */}
          {isRecording && (
            <span
              className="absolute left-1/2 -translate-x-1/2 text-[12px] font-bold tracking-wide"
              style={{ color: 'var(--brand)', animation: 'recording-pulse 1.6s ease-in-out infinite' }}
            >
              ● 경로 기록중
            </span>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-opacity active:opacity-60"
            style={{ background: 'var(--brand)', color: 'white' }}
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
            const isActive    = pathname === path
            const isRecordTab = path === '/map'
            // 다른 메뉴에 있을 때 기록 탭에 ●REC 표시 (기록 메뉴에서는 ErgonomicController가 담당)
            const showRec     = isRecordTab && isRecording && !isMapPage

            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="relative flex flex-1 flex-col items-center gap-1.5 py-4 transition-opacity active:opacity-60"
              >
                {/* ●REC 배지 — 탭바 안쪽 기록 아이콘 상단 (다른 탭에서만) */}
                {showRec && (
                  <span
                    className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full px-1.5 py-[3px]"
                    style={{
                      top:                  '4px',
                      background:           'rgba(10,15,30,0.72)',
                      backdropFilter:       'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border:               '1px solid rgba(239,68,68,0.25)',
                      whiteSpace:           'nowrap',
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-red-500"
                      style={{ animation: 'rec-dot-pulse 1.2s ease-in-out infinite' }}
                    />
                    <span className="text-[10px] font-bold tracking-widest text-red-400">REC</span>
                  </span>
                )}

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
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── 뒤로가기 두 번 종료 토스트 — 화면 중앙 텍스트 ── */}
      {showExitToast && (
        <div
          className="pointer-events-none fixed inset-0 z-[500] flex items-center justify-center"
        >
          <span
            className="rounded-full px-5 py-2.5 text-[13px] font-medium text-white/80"
            style={{
              background:           'rgba(10,15,30,0.72)',
              backdropFilter:       'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            한 번 더 뒤로가기하면 종료합니다
          </span>
        </div>
      )}

      {/* ── 기록 중 로그아웃 확인 모달 ── */}
      {showExitConfirm && (
        <>
          <div
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={() => setShowExitConfirm(false)}
          />
          <div
            className="fixed inset-x-4 top-1/2 z-[201] -translate-y-1/2 rounded-3xl p-6"
            style={{ background: '#111622', border: '1px solid rgba(255,255,255,0.10)', maxWidth: 360, margin: '0 auto' }}
          >
            <button
              onClick={() => setShowExitConfirm(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full active:opacity-60"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <X size={15} strokeWidth={1.5} className="text-white/50" />
            </button>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(239,68,68,0.12)' }}>
              <AlertTriangle size={22} strokeWidth={1.5} className="text-red-400" />
            </div>
            <p className="mb-1.5 text-[16px] font-bold text-white">경로 기록 중이에요</p>
            <p className="mb-6 text-[13px] font-light leading-relaxed text-white/45">
              지금 로그아웃하면 현재까지의<br />기록이 저장되지 않습니다.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex flex-1 items-center justify-center rounded-2xl py-3.5 text-sm font-semibold text-white/60 active:opacity-70"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
              >
                계속 기록
              </button>
              <button
                onClick={() => { setShowExitConfirm(false); doLogout() }}
                className="flex flex-[1.2] items-center justify-center gap-1.5 rounded-2xl py-3.5 text-sm font-bold text-white active:opacity-80"
                style={{ background: 'rgba(239,68,68,0.80)' }}
              >
                <LogOut size={14} strokeWidth={2} />
                로그아웃
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
