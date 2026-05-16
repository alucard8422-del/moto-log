// MapDisplay.tsx
import { Navigation2 } from 'lucide-react'
import type { Coordinates } from './types'

interface Props {
  path: Coordinates[]
  currentPosition: Coordinates | null
  isRiding: boolean
}

const W = 375
const H = 700

function toSvg(c: Coordinates, center: Coordinates) {
  const SCALE_LAT = 3200
  const SCALE_LNG = 3200 * Math.cos((center.lat * Math.PI) / 180)
  return {
    x: W / 2 + (c.lng - center.lng) * SCALE_LNG,
    y: H / 2 - (c.lat - center.lat) * SCALE_LAT,
  }
}

export default function MapDisplay({ path, currentPosition, isRiding }: Props) {
  const center: Coordinates = currentPosition ?? { lat: 37.5665, lng: 126.978, timestamp: 0 }

  const pts = path.map((c) => toSvg(c, center))
  const routeD =
    pts.length > 1
      ? pts.map(({ x, y }, i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
      : ''

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-[#0b1120]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0"
      >
        <defs>
          <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor="#0b1120" stopOpacity="0.65" />
          </radialGradient>
          <filter id="glow-pos">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* 도로 배경 레이어 */}
        <g stroke="rgba(148,163,184,0.07)" strokeWidth="7" fill="none" strokeLinecap="round">
          <path d="M 0 340 Q 110 300 210 335 T 375 315" />
          <path d="M 82 0 L 92 700" />
          <path d="M 255 0 L 265 700" />
          <path d="M 0 195 Q 155 185 375 208" />
          <path d="M 0 478 Q 205 460 375 488" />
          <path d="M 142 0 Q 122 350 162 700" />
        </g>
        <g stroke="rgba(148,163,184,0.035)" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M 0 340 Q 110 300 210 335 T 375 315" />
          <path d="M 82 0 L 92 700" />
          <path d="M 255 0 L 265 700" />
          <path d="M 0 195 Q 155 185 375 208" />
          <path d="M 0 478 Q 205 460 375 488" />
          <path d="M 142 0 Q 122 350 162 700" />
        </g>

        {/* GPX 경로 */}
        {routeD && (
          <>
            <path d={routeD} fill="none" stroke="#2DD4BF" strokeOpacity="0.2"
              strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d={routeD} fill="none" stroke="#2DD4BF" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-pos)" />
          </>
        )}

        {/* 출발 마커 */}
        {pts.length > 0 && (
          <circle cx={pts[0].x} cy={pts[0].y} r="5"
            fill="#2DD4BF" fillOpacity="0.45" stroke="#2DD4BF" strokeWidth="1.5" />
        )}

        {/* 현재 위치 */}
        <g>
          {isRiding && (
            <circle cx={W / 2} cy={H / 2} r="18" fill="#2DD4BF" fillOpacity="0.07">
              <animate attributeName="r" values="14;26;14" dur="2.2s" repeatCount="indefinite" />
              <animate attributeName="fill-opacity" values="0.09;0;0.09" dur="2.2s" repeatCount="indefinite" />
            </circle>
          )}
          <circle cx={W / 2} cy={H / 2} r="8" fill="#2DD4BF" fillOpacity="0.18" />
          <circle cx={W / 2} cy={H / 2} r="6" fill="#2DD4BF" filter="url(#glow-pos)" />
          <circle cx={W / 2} cy={H / 2} r="3.5" fill="white" />
        </g>

        <rect x="0" y="0" width={W} height={H} fill="url(#vignette)" />
      </svg>

      {/* 나침반 */}
      <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#161B26]/80 backdrop-blur-md">
        <Navigation2 size={16} strokeWidth={1.5} className="text-teal-400" />
      </div>

      {/* GPS 탐색 중 */}
      {!currentPosition && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-[#161B26]/80 px-3 py-1.5 backdrop-blur-md">
          <span className="text-[10px] font-light text-white/40">GPS 신호 탐색 중...</span>
        </div>
      )}

      {/* 스케일 */}
      <div className="absolute bottom-4 left-4">
        <div className="h-px w-12 bg-white/25" />
        <span className="text-[9px] font-light text-white/25">≈ 1 km</span>
      </div>
    </div>
  )
}
