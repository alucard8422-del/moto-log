// ErgonomicController.tsx
import { Play, Square, Flag, Timer, Route, Gauge } from 'lucide-react'
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
    <div className="mb-3 flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
      <div className="flex flex-col items-center">
        <Timer size={12} strokeWidth={1.5} className="mb-0.5 text-teal-400" />
        <span className="text-[13px] font-bold text-white">{fmt(duration)}</span>
        <span className="text-[9px] font-light text-white/30">시간</span>
      </div>
      <div className="h-8 w-px bg-white/8" />
      <div className="flex flex-col items-center">
        <Route size={12} strokeWidth={1.5} className="mb-0.5 text-teal-400" />
        <span className="text-[13px] font-bold text-white">{distance.toFixed(2)}<span className="text-[10px] font-light text-white/40"> km</span></span>
        <span className="text-[9px] font-light text-white/30">거리</span>
      </div>
      <div className="h-8 w-px bg-white/8" />
      <div className="flex flex-col items-center">
        <Gauge size={12} strokeWidth={1.5} className="mb-0.5 text-teal-400" />
        <span className="text-[13px] font-bold text-white">{avg.toFixed(0)}<span className="text-[10px] font-light text-white/40"> km/h</span></span>
        <span className="text-[9px] font-light text-white/30">평균속도</span>
      </div>
    </div>
  )
}

function NaviToggle({ naviType, onNaviChange }: { naviType: NavigationType; onNaviChange: (t: NavigationType) => void }) {
  return (
    <div className="mb-3 flex flex-col gap-1.5">
      <span className="text-[9px] font-light uppercase tracking-widest text-white/25">내비게이션</span>
      <div className="flex gap-1.5 rounded-2xl bg-white/5 p-1">
        {NAVI_OPTIONS.map((opt) => {
          const active = naviType === opt.type
          return (
            <button
              key={opt.type}
              onClick={() => {
                onNaviChange(opt.type)
                localStorage.setItem(NAVI_STORAGE_KEY, opt.type)
              }}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2.5 transition-all duration-200 ${
                active ? 'bg-teal-400' : 'bg-transparent'
              }`}
            >
              <span className={`text-sm font-black leading-none ${active ? 'text-slate-950' : 'text-white/40'}`}>
                {opt.badge}
              </span>
              <span className={`text-[9px] font-light leading-none ${active ? 'text-slate-950/70' : 'text-white/25'}`}>
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function ErgonomicController({
  status, naviType, duration, distance,
  onStart, onStop, onGoToCourses, onNaviChange,
}: Props) {

  if (status === 'finished') {
    return (
      <div className="absolute bottom-24 left-4 right-4">
        <div className="rounded-3xl bg-[#161B26]/94 p-4 backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2">
            <Flag size={14} strokeWidth={1.5} className="text-teal-400" />
            <span className="text-sm font-bold text-white">주행 완료</span>
          </div>
          <StatRow duration={duration} distance={distance} />
          <button
            onClick={onGoToCourses}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-teal-400 text-base font-bold text-slate-950 transition-opacity active:opacity-80"
          >
            코스 탭에서 기록 확인
          </button>
        </div>
      </div>
    )
  }

  if (status === 'riding') {
    return (
      <div className="absolute bottom-24 left-4 right-4">
        <div className="rounded-3xl bg-[#161B26]/94 p-4 backdrop-blur-xl">
          <StatRow duration={duration} distance={distance} />
          <button
            onClick={onStop}
            className="flex h-16 w-full items-center justify-center gap-2.5 rounded-2xl bg-rose-500/15 transition-opacity active:opacity-80"
          >
            <Square size={16} strokeWidth={2} className="text-rose-400" fill="currentColor" />
            <span className="text-base font-bold text-rose-400">도착 · 주행 종료</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute bottom-24 left-4 right-4">
      <div className="rounded-3xl bg-[#161B26]/94 p-4 backdrop-blur-xl">
        <NaviToggle naviType={naviType} onNaviChange={onNaviChange} />
        <button
          onClick={onStart}
          className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-teal-400 transition-opacity active:opacity-80"
        >
          <Play size={20} strokeWidth={2} className="text-slate-950" fill="currentColor" />
          <span className="text-lg font-bold text-slate-950">출발</span>
        </button>
      </div>
    </div>
  )
}
