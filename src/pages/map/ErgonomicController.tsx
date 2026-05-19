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
      <div className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="mx-auto max-w-sm rounded-t-3xl bg-[#161B26]/98 px-6 pt-5 pb-12 backdrop-blur-xl">
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/15" />
          <div className="mb-6 flex items-center gap-2">
            <Flag size={13} strokeWidth={1.5} className="text-teal-400" />
            <span className="text-[10px] font-light uppercase tracking-widest text-white/30">Ride Complete</span>
          </div>
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
          <button
            onClick={onGoToCourses}
            className="w-full rounded-3xl bg-teal-400 py-4 text-sm font-bold text-slate-950 transition-opacity active:opacity-80"
          >
            내 경로에 저장하기
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
      <div className="pointer-events-none absolute inset-0 z-20">
        {/* 정지 FAB — 중앙 하단 */}
        <button
          onClick={onStop}
          className="pointer-events-auto absolute bottom-24 left-1/2 -translate-x-1/2 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 shadow-[0_0_24px_4px_rgba(244,63,94,0.45)] active:opacity-80"
        >
          <Square size={22} strokeWidth={0} fill="white" />
        </button>
      </div>
    )
  }

  // idle
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {/* 레이블 */}
      <span className="absolute bottom-[7.5rem] left-1/2 -translate-x-1/2 text-[11px] font-light tracking-widest text-white/40 select-none">
        주행 시작
      </span>
      {/* 시작 FAB */}
      <button
        onClick={onStart}
        className="pointer-events-auto absolute bottom-24 left-1/2 -translate-x-1/2 flex h-16 w-16 items-center justify-center rounded-full bg-teal-400 shadow-[0_0_24px_4px_rgba(45,212,191,0.40)] active:opacity-80"
      >
        <Play size={26} strokeWidth={0} fill="#0B0F19" className="translate-x-0.5" />
      </button>
    </div>
  )
}
