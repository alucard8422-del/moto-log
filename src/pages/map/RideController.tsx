// RideController.tsx
import { Play, Square, Settings2, Flag, Timer, Route, Gauge } from 'lucide-react'
import { NAVI_OPTIONS, type NavigationType, type RideStatus } from './types'

interface Props {
  status: RideStatus
  naviType: NavigationType | null
  duration: number
  distance: number
  onStart: () => void
  onStop: () => void
  onGoToCourses: () => void
  onOpenSettings: () => void
}

function formatTime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function StatCell({ icon, value, label, highlight = false }: {
  icon: React.ReactNode; value: string; label: string; highlight?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-white/5 py-3">
      <span className={highlight ? 'text-teal-400' : 'text-white/25'}>{icon}</span>
      <span className={`text-sm font-bold ${highlight ? 'text-white' : 'text-white/60'}`}>{value}</span>
      <span className="text-[9px] font-light text-white/25">{label}</span>
    </div>
  )
}

export default function RideController({
  status, naviType, duration, distance,
  onStart, onStop, onGoToCourses, onOpenSettings,
}: Props) {
  const avgSpeed = duration > 0 ? (distance / (duration / 3600)) : 0
  const naviOpt = NAVI_OPTIONS.find((o) => o.type === naviType)

  if (status === 'finished') {
    return (
      <div className="absolute bottom-32 left-4 right-4">
        <div className="rounded-3xl bg-[#161B26]/92 p-5 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2">
            <Flag size={15} strokeWidth={1.5} className="text-teal-400" />
            <span className="text-sm font-bold text-white">주행 완료</span>
          </div>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <StatCell icon={<Timer size={13} strokeWidth={1.5} />} label="시간" value={formatTime(duration)} highlight />
            <StatCell icon={<Route size={13} strokeWidth={1.5} />} label="거리" value={`${distance.toFixed(2)}km`} highlight />
            <StatCell icon={<Gauge size={13} strokeWidth={1.5} />} label="평균" value={`${avgSpeed.toFixed(0)}km/h`} highlight />
          </div>
          <button onClick={onGoToCourses}
            className="w-full rounded-2xl bg-teal-400 py-3.5 text-sm font-bold text-slate-950 transition-opacity active:opacity-80">
            코스 탭에서 기록 확인
          </button>
        </div>
      </div>
    )
  }

  if (status === 'riding') {
    return (
      <div className="absolute bottom-32 left-4 right-4">
        <div className="rounded-3xl bg-[#161B26]/92 p-5 backdrop-blur-xl">
          <div className="mb-4 grid grid-cols-3 gap-2">
            <StatCell icon={<Timer size={13} strokeWidth={1.5} />} label="시간" value={formatTime(duration)} highlight />
            <StatCell icon={<Route size={13} strokeWidth={1.5} />} label="거리" value={`${distance.toFixed(2)}km`} highlight />
            <StatCell icon={<Gauge size={13} strokeWidth={1.5} />} label="평균" value={`${avgSpeed.toFixed(0)}km/h`} highlight />
          </div>
          <button onClick={onStop}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500/15 py-3.5 transition-opacity active:opacity-80">
            <Square size={13} strokeWidth={2} className="text-rose-400" fill="currentColor" />
            <span className="text-sm font-bold text-rose-400">도착 · 주행 종료</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute bottom-32 left-4 right-4">
      <div className="rounded-3xl bg-[#161B26]/92 p-5 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-light uppercase tracking-widest text-white/25">Ready</p>
            <p className="mt-0.5 text-sm font-light text-white/50">
              출발하면 GPX 기록이 시작됩니다
            </p>
          </div>
          <button onClick={onOpenSettings}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 transition-opacity active:opacity-60">
            <Settings2 size={15} strokeWidth={1.5} className="text-white/40" />
          </button>
        </div>

        <div className="flex gap-2.5">
          {/* 출발 버튼 */}
          <button onClick={onStart}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-400 py-4 transition-opacity active:opacity-80">
            <Play size={16} strokeWidth={2} className="text-slate-950" fill="currentColor" />
            <span className="text-sm font-bold text-slate-950">출발</span>
          </button>

          {/* 선택된 내비 뱃지 */}
          <button onClick={onOpenSettings}
            className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl bg-white/8 transition-opacity active:opacity-60">
            <span className="text-base font-black text-white/60">
              {naviOpt?.badge ?? '?'}
            </span>
            <span className="text-[8px] font-light text-white/30">
              {naviOpt ? naviOpt.label : '설정'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
