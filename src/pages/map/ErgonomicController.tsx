// ErgonomicController.tsx
import { useState } from 'react'
import { Play, Square, Flag, Timer, Route, Gauge, ChevronDown, Check } from 'lucide-react'
import { NAVI_OPTIONS, NAVI_STORAGE_KEY, type NavigationType, type RideStatus } from './types'

interface Props {
  status: RideStatus
  naviType: NavigationType
  duration: number
  distance: number
  onStart: () => void
  onStop: () => void
  onGoToCourses: () => void
  onNaviChange: (type: NavigationType) => void
}

function fmt(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function StatRow({ duration, distance }: { duration: number; distance: number }) {
  const avg = duration > 0 ? distance / (duration / 3600) : 0
  return (
    <div className="mb-3 flex items-center justify-between rounded-2xl bg-white/5 px-5 py-3">
      {[
        { icon: <Timer size={12} strokeWidth={1.5} className="text-teal-400" />, value: fmt(duration), label: '시간' },
        { icon: <Route size={12} strokeWidth={1.5} className="text-teal-400" />, value: `${distance.toFixed(2)} km`, label: '거리' },
        { icon: <Gauge size={12} strokeWidth={1.5} className="text-teal-400" />, value: `${avg.toFixed(0)} km/h`, label: '평균' },
      ].map(({ icon, value, label }, i, arr) => (
        <div key={label} className="flex flex-1 flex-col items-center gap-0.5">
          {icon}
          <span className="text-sm font-bold tabular-nums text-white">{value}</span>
          <span className="text-[9px] font-light text-white/30">{label}</span>
          {i < arr.length - 1 && (
            <div className="pointer-events-none absolute" />
          )}
        </div>
      ))}
    </div>
  )
}

function NaviSheet({
  naviType,
  onNaviChange,
  onClose,
}: {
  naviType: NavigationType
  onNaviChange: (t: NavigationType) => void
  onClose: () => void
}) {
  return (
    <>
      {/* 백드롭 */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 바텀 시트 */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-sm rounded-t-3xl bg-[#161B26]/98 px-5 pt-4 pb-10 backdrop-blur-xl">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
          <p className="mb-3 text-[10px] font-light uppercase tracking-widest text-white/30">
            내비게이션 변경
          </p>

          <div className="flex flex-col gap-2">
            {NAVI_OPTIONS.map((opt) => {
              const active = naviType === opt.type
              return (
                <button
                  key={opt.type}
                  onClick={() => {
                    onNaviChange(opt.type)
                    localStorage.setItem(NAVI_STORAGE_KEY, opt.type)
                    onClose()
                  }}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-150 ${
                    active ? 'bg-teal-400/10 ring-1 ring-teal-400/40' : 'bg-white/5'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                      active ? 'bg-teal-400 text-slate-950' : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {opt.badge}
                  </div>
                  <span className={`flex-1 text-left text-sm font-semibold ${active ? 'text-teal-400' : 'text-white/70'}`}>
                    {opt.label}
                  </span>
                  {active && <Check size={14} strokeWidth={2.5} className="text-teal-400" />}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

export default function ErgonomicController({
  status, naviType, duration, distance,
  onStart, onStop, onGoToCourses, onNaviChange,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const currentNavi = NAVI_OPTIONS.find((o) => o.type === naviType)!

  if (status === 'finished') {
    return (
      <div className="absolute bottom-24 left-4 right-4 z-20 [@media(orientation:landscape)]:bottom-6 [@media(orientation:landscape)]:left-6 [@media(orientation:landscape)]:right-auto [@media(orientation:landscape)]:w-80">
        <div className="rounded-2xl border border-white/5 bg-[#111622]/90 p-4 shadow-lg shadow-black/40 backdrop-blur-md">
          <div className="mb-3 flex items-center gap-2">
            <Flag size={14} strokeWidth={1.5} className="text-teal-400" />
            <span className="text-sm font-bold text-white">주행 완료</span>
          </div>
          <StatRow duration={duration} distance={distance} />
          <button
            onClick={onGoToCourses}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-teal-400 text-base font-bold text-slate-950 transition-opacity active:opacity-75"
          >
            코스 탭에서 기록 확인
          </button>
        </div>
      </div>
    )
  }

  if (status === 'riding') {
    return (
      <div className="absolute bottom-24 left-4 right-4 z-20 [@media(orientation:landscape)]:bottom-6 [@media(orientation:landscape)]:left-6 [@media(orientation:landscape)]:right-auto [@media(orientation:landscape)]:w-80">
        <button
          onClick={onStop}
          className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl border border-rose-500/20 bg-[#111622]/90 shadow-lg shadow-black/40 backdrop-blur-md transition-opacity active:opacity-75"
        >
          <Square size={15} strokeWidth={2} className="text-rose-400" fill="currentColor" />
          <span className="text-base font-bold text-rose-400">도착 · 주행 종료</span>
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="absolute bottom-24 left-4 right-4 z-20 [@media(orientation:landscape)]:bottom-6 [@media(orientation:landscape)]:left-6 [@media(orientation:landscape)]:right-auto [@media(orientation:landscape)]:w-80">
        <div className="rounded-2xl border border-white/5 bg-[#111622]/90 p-4 shadow-lg shadow-black/40 backdrop-blur-md">
          <div className="flex gap-2.5">
            {/* 출발 버튼 (좌측 full) */}
            <button
              onClick={onStart}
              className="flex h-16 flex-1 items-center justify-center gap-3 rounded-2xl bg-teal-400 transition-opacity active:opacity-75"
            >
              <Play size={22} strokeWidth={2} className="text-slate-950" fill="currentColor" />
              <span className="text-xl font-bold text-slate-950">출발</span>
            </button>

            {/* 내비 뱃지 버튼 (우측 끝) */}
            <button
              onClick={() => setSheetOpen(true)}
              className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-white/8 transition-opacity active:opacity-70"
            >
              <span className="text-xl font-black text-white/80">{currentNavi.badge}</span>
              <ChevronDown size={10} strokeWidth={2} className="text-white/30" />
            </button>
          </div>
        </div>
      </div>

      {sheetOpen && (
        <NaviSheet
          naviType={naviType}
          onNaviChange={onNaviChange}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  )
}
