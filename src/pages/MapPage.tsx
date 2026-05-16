import MapContainer from '../components/MapContainer'
import { Search, SlidersHorizontal, Fuel } from 'lucide-react'
import { parseFuelSms } from '../lib/fuelFilter'
import { useFuel } from '../context/FuelContext'

const MOCK_SMS = {
  sender: 'GS칼텍스',
  body: '[Web발신] GS칼텍스 결제완료\n가맹점: GS주유소강남점\n금액: 28,000원\n일시: 2026-05-16',
  receivedAt: new Date(),
}

export default function MapPage() {
  const { triggerFuelPopup } = useFuel()

  const handleFuelTest = () => {
    const detected = parseFuelSms(MOCK_SMS)
    if (detected) {
      triggerFuelPopup(detected)
    } else {
      console.warn('[MapPage] 주유 문자 감지 실패')
    }
  }

  return (
    <div className="flex h-[calc(100svh-64px-112px)] flex-col gap-4 p-4">
      {/* 검색 바 */}
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
          <Search size={16} strokeWidth={1.5} className="text-white/30" />
          <input
            type="text"
            placeholder="지역, 코스 이름 검색"
            className="flex-1 bg-transparent text-sm font-light text-white placeholder-white/30 outline-none"
            onChange={(e) => console.log('[MapPage] 검색:', e.target.value)}
          />
        </div>
        <button className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/5 bg-white/5">
          <SlidersHorizontal size={16} strokeWidth={1.5} className="text-white/60" />
        </button>
      </div>

      {/* 지도 */}
      <div className="flex-1 overflow-hidden rounded-3xl">
        <MapContainer />
      </div>

      {/* 주유 감지 테스트 버튼 */}
      <button
        onClick={handleFuelTest}
        className="flex items-center justify-center gap-2 rounded-2xl bg-white/5 py-3 text-sm font-light text-white/50 transition-colors active:bg-white/10"
      >
        <Fuel size={14} strokeWidth={1.5} className="text-teal-400" />
        주유 기록 테스트
      </button>
    </div>
  )
}
