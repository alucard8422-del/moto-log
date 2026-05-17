// ErgonomicController.tsx
import { useState, useEffect } from 'react'
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

function RideCompleteSheet({
  duration, distance, onGoToCourses,
}: { duration: number; distance: number; onGoToCourses: () => void }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 16)
    return () => clearTimeout(t)
  }, [])

  const avg = duration > 0 ? distance / (duration / 3600) : 0

  const rows = [
    { icon: <Timer size={14} strokeWidth={1.5} className="text-teal-400" />, label: '주행 시간', value: fmt(duration) },
    { icon: <Route size={14} strokeWidth={1.5} className="text-teal-400" />, label: '주행 거리', value: `${distance.toFixed(2)} km` },
    { icon: <Gauge size={14} strokeWidth={1.5} className="text-teal-400" />, label: '평균 속도', value: `${avg.toFixed(0)} km/h` },
  ]

  return (
    <>
      {/* 백드롭 */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* 바텀 시트 */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto max-w-sm rounded-t-3xl bg-[#161B26]/98 px-6 pt-5 pb-12 backdrop-blur-xl">
          {/* 핸들바 */}
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/20" />

          {/* 헤더 */}
          <div className="mb-6 flex items-center gap-2">
            <Flag size={13} strokeWidth={1.5} className="text-teal-400" />
            <span className="text-[10px] font-light uppercase tracking-widest text-white/30">
              Ride Complete
            </span>
          </div>

          {/* 스탯 로우 */}
          <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-white/5 px-5 py-4">
            {rows.map(({ icon, label, value }, i) => (
              <div key={label}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-sm font-light text-white/40">{label}</span>
                  </div>
                  <span className="text-sm font-bold text-teal-400">{value}</span>
                </div>
                {i < rows.length - 1 && <div className="mt-4 h-px bg-white/5" />}
              </div>
            ))}
          </div>

          {/* CTA → 공유 탭으로 전환 */}
          <button
            onClick={onGoToCourses}
            className="w-full rounded-3xl bg-teal-400 py-4 text-sm font-bold text-slate-950 transition-opacity active:opacity-80"
          >
            기록 확인 및 공유하기
          </button>
        </div>
      </div>
    </>
  )
}


export default function ErgonomicController({
  status, duration, distance,
  onStart, onStop, onGoToCourses,
}: Props) {

  if (status === 'finished') {
    return <RideCompleteSheet duration={duration} distance={distance} onGoToCourses={onGoToCourses} />
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
