// ErgonomicController.tsx
import { Play, Square, Flag, Timer, Route, Gauge } from 'lucide-react'
import { type RideStatus } from './types'

interface Props {
  status: RideStatus
  duration: number
  distance: number
  onStart: () => void
  onStop: () => void
  onGoToCourses: () => void
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


export default function ErgonomicController({
  status, duration, distance,
  onStart, onStop, onGoToCourses,
}: Props) {

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
        <div className="rounded-2xl border border-white/5 bg-[#111622]/90 p-4 shadow-lg shadow-black/40 backdrop-blur-md">
          <button
            onClick={onStop}
            className="flex h-16 w-full items-center justify-center rounded-2xl bg-rose-500/10 transition-opacity active:opacity-75"
          >
            <Square size={24} strokeWidth={2} className="text-rose-400" fill="currentColor" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="absolute bottom-24 left-4 right-4 z-20 [@media(orientation:landscape)]:bottom-6 [@media(orientation:landscape)]:left-6 [@media(orientation:landscape)]:right-auto [@media(orientation:landscape)]:w-80">
        <div className="rounded-2xl border border-white/5 bg-[#111622]/90 p-4 shadow-lg shadow-black/40 backdrop-blur-md">
          <button
            onClick={onStart}
            className="flex h-16 w-full items-center justify-center rounded-2xl bg-teal-400/10 transition-opacity active:opacity-75"
          >
            <Play size={28} strokeWidth={2} className="text-[#2DD4BF]" fill="#2DD4BF" />
          </button>
        </div>
      </div>

    </>
  )
}
