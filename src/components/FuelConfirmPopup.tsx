import { Fuel } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { saveFuelLog, type FuelType } from '../lib/fuelService'
import { useFuel } from '../context/FuelContext'

export default function FuelConfirmPopup() {
  const { pendingFuel, clearFuelPopup } = useFuel()
  const navigate = useNavigate()

  const handleSelect = async (fuelType: FuelType) => {
    if (!pendingFuel) return
    await saveFuelLog({
      storeName: pendingFuel.storeName,
      amount: pendingFuel.amount,
      fuelType,
      loggedAt: pendingFuel.receivedAt.toISOString(),
    })
    clearFuelPopup()
    navigate('/fuel-complete', {
      state: {
        fuelType,
        amount: pendingFuel.amount,
        storeName: pendingFuel.storeName,
        totalKm: 0,
        loggedAt: pendingFuel.receivedAt.toISOString(),
      },
    })
  }

  return (
    <>
      {/* 딤드 배경 */}
      <div
        className={`fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300 ${
          pendingFuel ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={clearFuelPopup}
      />

      {/* 슬라이드업 팝업 */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 ease-out ${
          pendingFuel ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto max-w-sm rounded-t-3xl bg-[#161B26]/95 p-6 pb-10 backdrop-blur-xl">

          {/* 핸들 */}
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />

          {/* 아이콘 + 문구 */}
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-400/10">
              <Fuel size={18} strokeWidth={1.5} className="text-teal-400" />
            </div>
            <p className="text-sm font-light leading-relaxed text-white/70">
              방금{' '}
              <span className="font-bold text-white">
                {pendingFuel?.storeName}
              </span>
              에서{' '}
              <span className="font-bold text-teal-400">
                {pendingFuel?.amount.toLocaleString()}원
              </span>{' '}
              주유 문자를 확인했어요.
              <br />
              어떤 유종으로 등록할까요?
            </p>
          </div>

          {/* 버튼 2개 */}
          <div className="flex gap-3">
            <button
              onClick={() => handleSelect('regular')}
              className="flex flex-1 flex-col items-center gap-1 rounded-3xl bg-white/8 py-5 transition-opacity active:opacity-70"
            >
              <span className="text-base font-bold text-white">일반유</span>
              <span className="text-[11px] font-light text-white/40">Regular</span>
            </button>

            <button
              onClick={() => handleSelect('premium')}
              className="flex flex-1 flex-col items-center gap-1 rounded-3xl bg-teal-400 py-5 transition-opacity active:opacity-70"
            >
              <span className="text-base font-bold text-slate-950">고급유</span>
              <span className="text-[11px] font-light text-slate-950/60">Premium</span>
            </button>
          </div>

          <button
            onClick={clearFuelPopup}
            className="mt-4 w-full text-center text-xs font-light text-white/25"
          >
            닫기
          </button>
        </div>
      </div>
    </>
  )
}
