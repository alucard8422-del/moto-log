import MapContainer from '../components/MapContainer'
import { Search, SlidersHorizontal } from 'lucide-react'

export default function MapPage() {
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
    </div>
  )
}
