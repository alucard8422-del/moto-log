import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, Fuel, Gauge, Calendar } from 'lucide-react'

interface FuelCompleteState {
  fuelType: 'regular' | 'premium'
  amount: number
  storeName: string
  totalKm: number
  loggedAt: string
}

export default function FuelCompletePage() {
  const navigate = useNavigate()
  const { state } = useLocation() as { state: FuelCompleteState | null }

  const fuelType = state?.fuelType ?? 'regular'
  const amount = state?.amount ?? 0
  const storeName = state?.storeName ?? '-'
  const totalKm = state?.totalKm ?? 0
  const loggedAt = state?.loggedAt ? new Date(state.loggedAt) : new Date()

  const label = fuelType === 'premium' ? '고급유' : '일반유'

  const dateStr = loggedAt.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const timeStr = loggedAt.toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#0B0F19] px-6 pb-32 pt-16">

      {/* 완료 아이콘 */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#FF5A00]/10">
        <CheckCircle size={32} strokeWidth={1.5} className="text-[#FF5A00]" />
      </div>

      {/* 타이틀 */}
      <p className="mb-1 text-xs font-light uppercase tracking-widest text-white/30">
        {storeName}
      </p>
      <h1 className="mb-10 text-2xl font-bold text-[#FF5A00]">
        {label} 등록 완료
      </h1>

      {/* 데이터 카드 */}
      <div className="w-full max-w-sm rounded-3xl bg-[#161B26]/60 p-6 backdrop-blur-xl">
        <div className="flex flex-col gap-5">

          <Row
            icon={<Fuel size={16} strokeWidth={1.5} className="text-[#FF5A00]" />}
            label="주유 금액"
            value={`${amount.toLocaleString()}원`}
            highlight
          />

          <div className="h-px bg-white/5" />

          <Row
            icon={<Gauge size={16} strokeWidth={1.5} className="text-white/30" />}
            label="누적 주행거리"
            value={`${totalKm.toLocaleString()} km`}
          />

          <div className="h-px bg-white/5" />

          <Row
            icon={<Calendar size={16} strokeWidth={1.5} className="text-white/30" />}
            label="등록 일시"
            value={`${dateStr} ${timeStr}`}
          />

        </div>
      </div>

      {/* 확인 버튼 */}
      <button
        onClick={() => navigate('/map')}
        className="fixed bottom-28 left-1/2 w-[calc(100%-3rem)] max-w-sm -translate-x-1/2 rounded-3xl bg-[#FF5A00] py-4 text-sm font-bold text-white transition-opacity active:opacity-80"
      >
        확인
      </button>
    </div>
  )
}

function Row({
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
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-light text-white/40">{label}</span>
      </div>
      <span className={`text-sm font-bold ${highlight ? 'text-[#FF5A00]' : 'text-white'}`}>
        {value}
      </span>
    </div>
  )
}
