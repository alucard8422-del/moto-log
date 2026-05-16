import { CheckCircle, Fuel, Calendar } from 'lucide-react'
import { useFuel } from '../context/FuelContext'

export default function FuelCompleteSheet() {
  const { completedFuel, clearComplete } = useFuel()

  const isOpen = !!completedFuel
  const label = completedFuel?.fuelType === 'premium' ? '고급유' : '일반유'
  const loggedAt = completedFuel?.loggedAt ? new Date(completedFuel.loggedAt) : new Date()

  const dateStr = loggedAt.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  const timeStr = loggedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={clearComplete}
      />

      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto max-w-sm rounded-t-3xl bg-[#161B26]/98 px-6 pt-5 pb-12 backdrop-blur-xl">
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/20" />

          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-400/10">
              <CheckCircle size={28} strokeWidth={1.5} className="text-teal-400" />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-light uppercase tracking-widest text-white/30">
                {completedFuel?.storeName}
              </p>
              <p className="mt-1 text-xl font-bold text-teal-400">{label} 등록 완료</p>
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-white/5 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fuel size={15} strokeWidth={1.5} className="text-teal-400" />
                <span className="text-sm font-light text-white/40">주유 금액</span>
              </div>
              <span className="text-sm font-bold text-teal-400">
                {completedFuel?.amount.toLocaleString()}원
              </span>
            </div>

            <div className="h-px bg-white/5" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={15} strokeWidth={1.5} className="text-white/30" />
                <span className="text-sm font-light text-white/40">등록 일시</span>
              </div>
              <span className="text-sm font-bold text-white">{dateStr} {timeStr}</span>
            </div>
          </div>

          <button
            onClick={clearComplete}
            className="w-full rounded-3xl bg-teal-400 py-4 text-sm font-bold text-slate-950 transition-opacity active:opacity-80"
          >
            확인
          </button>
        </div>
      </div>
    </>
  )
}
