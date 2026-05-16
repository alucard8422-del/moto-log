// RideControls.tsx
import { Play, Square, Flag, Navigation, Timer, Gauge, Route } from 'lucide-react'
import type { RideStatus } from './types'

interface Props {
  status: RideStatus
  duration: number
  distance: number
  onStart: () => void
  onStop: () => void
  onNavigate: () => void
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function RideControls({ status, duration, distance, onStart, onStop, onNavigate }: Props) {
  const avgSpeed = duration > 0 ? (distance / (duration / 3600)) : 0

  if (status === 'finished') {
    return (
      <div className="absolute bottom-32 left-4 right-4">
        <div className="rounded-3xl bg-[#161B26]/90 p-5 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2">
            <Flag size={16} strokeWidth={1.5} className="text-teal-400" />
            <span className="text-sm font-bold text-white">주행 완료</span>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <StatCard icon={<Timer size={13} strokeWidth={1.5} />} label="시간" value={formatDuration(duration)} />
            <StatCard icon={<Route size={13} strokeWidth={1.5} />} label="거리" value={`${distance.toFixed(1)} km`} />
            <StatCard icon={<Gauge size={13} strokeWidth={1.5} />} label="평균속도" value={`${avgSpeed.toFixed(0)} km/h`} />
          </div>

          <button
            onClick={onNavigate}
            className="w-full rounded-2xl bg-teal-400 py-3.5 text-sm font-bold text-slate-950 transition-opacity active:opacity-80"
          >
            코스 탭에서 기록 확인
          </button>
        </div>
      </div>
    )
  }

  if (status === 'riding') {
    return (
      <div className="absolute bottom-32 left-4 right-4">
        <div className="rounded-3xl bg-[#161B26]/90 p-5 backdrop-blur-xl">
          {/* 실시간 통계 */}
          <div className="mb-4 grid grid-cols-3 gap-2">
            <StatCard icon={<Timer size={13} strokeWidth={1.5} />} label="시간" value={formatDuration(duration)} highlight />
            <StatCard icon={<Route size={13} strokeWidth={1.5} />} label="거리" value={`${distance.toFixed(2)} km`} highlight />
            <StatCard icon={<Gauge size={13} strokeWidth={1.5} />} label="평균속도" value={`${avgSpeed.toFixed(0)} km/h`} highlight />
          </div>

          {/* 도착 버튼 */}
          <button
            onClick={onStop}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500/20 py-3.5 transition-opacity active:opacity-80"
          >
            <Square size={14} strokeWidth={2} className="text-rose-400" fill="currentColor" />
            <span className="text-sm font-bold text-rose-400">도착 · 주행 종료</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute bottom-32 left-4 right-4">
      <div className="rounded-3xl bg-[#161B26]/90 p-5 backdrop-blur-xl">
        <p className="mb-1 text-[10px] font-light uppercase tracking-widest text-white/30">
          Ready to Ride
        </p>
        <p className="mb-4 text-sm font-light text-white/60">
          출발 버튼을 눌러 주행을 시작하세요
        </p>

        <div className="flex gap-2">
          <button
            onClick={onStart}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-400 py-4 transition-opacity active:opacity-80"
          >
            <Play size={16} strokeWidth={2} className="text-slate-950" fill="currentColor" />
            <span className="text-sm font-bold text-slate-950">출발</span>
          </button>

          <button
            onClick={onNavigate}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/8 transition-opacity active:opacity-70"
            title="카카오내비"
          >
            <Navigation size={18} strokeWidth={1.5} className="text-white/60" />
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-white/5 py-3">
      <span className={highlight ? 'text-teal-400' : 'text-white/30'}>{icon}</span>
      <span className={`text-sm font-bold ${highlight ? 'text-white' : 'text-white/60'}`}>{value}</span>
      <span className="text-[9px] font-light text-white/30">{label}</span>
    </div>
  )
}
