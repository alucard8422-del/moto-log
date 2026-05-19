import { Locate, MapPin } from 'lucide-react'

declare global {
  interface Window {
    kakao: any
  }
}

interface MapContainerProps {
  center?: { lat: number; lng: number }
  level?: number
}

const PINS = [
  { x: '38%', y: '28%', active: true },
  { x: '62%', y: '45%', active: false },
  { x: '24%', y: '58%', active: false },
  { x: '70%', y: '22%', active: false },
]

export default function MapContainer({
  center: _center = { lat: 37.5665, lng: 126.978 },
  level: _level = 5,
}: MapContainerProps) {
  const handleLocateMe = () => {
    console.log('[MapContainer] 내 위치 찾기 요청')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('[MapContainer] 현재 위치', {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      },
      (err) => {
        console.warn('[MapContainer] 위치 권한 거부됨', err.message)
      }
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl bg-[#0b1120]">

      {/* ── 격자 레이어 ── */}
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path
              d="M 36 0 L 0 0 0 36"
              fill="none"
              stroke="rgba(148,163,184,0.06)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* ── 가짜 도로선 ── */}
        {/* 대로 — 수평 */}
        <path
          d="M -20 42% Q 30% 38%, 55% 44% T 110% 40%"
          fill="none"
          stroke="rgba(51,65,85,0.9)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* 대로 위 중앙선 */}
        <path
          d="M -20 42% Q 30% 38%, 55% 44% T 110% 40%"
          fill="none"
          stroke="rgba(71,85,105,0.4)"
          strokeWidth="1.5"
          strokeDasharray="12 10"
          strokeLinecap="round"
        />

        {/* 소로 — 대각선 우하향 */}
        <path
          d="M 10% 10% Q 35% 30%, 52% 44%"
          fill="none"
          stroke="rgba(51,65,85,0.7)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* 소로 — 대각선 우상향 */}
        <path
          d="M 52% 44% Q 68% 30%, 88% 18%"
          fill="none"
          stroke="rgba(51,65,85,0.7)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* 소로 — 수직 분기 */}
        <path
          d="M 52% 44% Q 54% 62%, 46% 80%"
          fill="none"
          stroke="rgba(51,65,85,0.6)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* 골목 — 짧은 수평 */}
        <path
          d="M 60% 60% L 82% 62%"
          fill="none"
          stroke="rgba(51,65,85,0.5)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* teal 하이라이트 루트 — 대표 코스 강조선 */}
        <path
          d="M 10% 10% Q 35% 30%, 52% 44% Q 68% 30%, 88% 18%"
          fill="none"
          stroke="#2DD4BF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.55"
        />
      </svg>

      {/* ── 반경 펄스 (현재 위치 표시) ── */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: '38%', top: '28%' }}
      >
        <span className="absolute inline-flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-teal-400 opacity-10" />
        <span className="absolute inline-flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400/30" />
      </div>

      {/* ── MapPin 마커들 ── */}
      {PINS.map(({ x, y, active }, i) => (
        <div
          key={i}
          className="absolute -translate-x-1/2 -translate-y-full"
          style={{ left: x, top: y }}
        >
          <MapPin
            size={active ? 22 : 16}
            strokeWidth={1.5}
            className={active ? 'text-teal-400 drop-shadow-lg' : 'text-slate-500'}
            fill={active ? 'rgba(45,212,191,0.2)' : 'transparent'}
          />
        </div>
      ))}

      {/* ── 하단 정보 칩 ── */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-2xl border border-white/5 bg-slate-950/80 px-3 py-2 backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
        <span className="text-xs font-light text-white/50">카카오맵 연동 대기 중</span>
      </div>

      {/* ── 내 위치 버튼 ── */}
      <button
        onClick={handleLocateMe}
        className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/5 bg-slate-950/80 shadow-md backdrop-blur-sm transition-opacity active:opacity-70"
      >
        <Locate size={18} strokeWidth={1.5} className="text-teal-400" />
      </button>
    </div>
  )
}
