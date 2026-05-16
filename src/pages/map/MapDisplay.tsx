// MapDisplay.tsx
import { Navigation2, WifiOff } from 'lucide-react'
import { GEO_ERROR_MSG, type GeoErrorCode } from './useGeolocation'
import type { Coordinates } from './types'

interface Props {
  path: Coordinates[]
  currentPosition: Coordinates | null
  isRiding: boolean
  geoError: GeoErrorCode | null
  geoLoading: boolean
}

const W = 375
const H = 700

function toSvg(c: Coordinates, center: Coordinates) {
  const SCALE = 3200
  const scaleLng = SCALE * Math.cos((center.lat * Math.PI) / 180)
  return {
    x: W / 2 + (c.lng - center.lng) * scaleLng,
    y: H / 2 - (c.lat - center.lat) * SCALE,
  }
}

export default function MapDisplay({ path, currentPosition, isRiding, geoError, geoLoading }: Props) {
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
        touchAction: 'pan-x pan-y pinch-zoom',
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
            <stop offset="100%" stopColor="#0b1120" stopOpacity="0.6" />
          </radialGradient>
          <filter id="glow-fx">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* 배경 도로 레이어 */}
        <g stroke="rgba(148,163,184,0.07)" strokeWidth="7" fill="none" strokeLinecap="round">
          <path d="M 0 340 Q 110 300 210 335 T 375 315" />
          <path d="M 82 0 L 92 700" />
          <path d="M 255 0 L 265 700" />
          <path d="M 0 195 Q 155 185 375 208" />
          <path d="M 0 478 Q 205 460 375 488" />
          <path d="M 142 0 Q 122 350 162 700" />
        </g>
        <g stroke="rgba(148,163,184,0.03)" strokeWidth="2" fill="none" strokeLinecap="round">
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
            <path d={routeD} fill="none" stroke="#2DD4BF" strokeOpacity="0.18"
              strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            <path d={routeD} fill="none" stroke="#2DD4BF" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-fx)" />
          </>
        )}

        {/* 출발 마커 */}
        {pts.length > 0 && (
          <circle cx={pts[0].x} cy={pts[0].y} r="5"
            fill="#2DD4BF" fillOpacity="0.4" stroke="#2DD4BF" strokeWidth="1.5" />
        )}

        {/* 현재 위치 */}
        {!geoError && (
          <g>
            {isRiding && (
              <circle cx={W / 2} cy={H / 2} r="18" fill="#2DD4BF" fillOpacity="0.07">
                <animate attributeName="r" values="14;28;14" dur="2s" repeatCount="indefinite" />
                <animate attributeName="fill-opacity" values="0.09;0;0.09" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={W / 2} cy={H / 2} r="9" fill="#2DD4BF" fillOpacity="0.2" />
            <circle cx={W / 2} cy={H / 2} r="6.5" fill="#2DD4BF" filter="url(#glow-fx)" />
            <circle cx={W / 2} cy={H / 2} r="3.5" fill="white" />
          </g>
        )}

        <rect x="0" y="0" width={W} height={H} fill="url(#vignette)" />
      </svg>

      {/* 나침반 */}
      <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#161B26]/80 backdrop-blur-md">
        <Navigation2 size={16} strokeWidth={1.5} className="text-teal-400" />
      </div>

      {/* 스케일 */}
      <div className="absolute bottom-4 left-4">
        <div className="h-px w-12 bg-white/25" />
        <span className="text-[9px] font-light text-white/25">≈ 1 km</span>
      </div>

      {/* GPS 오류 오버레이 */}
      {(geoError || geoLoading) && (
        <div className="absolute left-1/2 top-5 -translate-x-1/2">
          <div className="flex items-start gap-2.5 rounded-2xl bg-[#161B26]/90 px-4 py-3 backdrop-blur-xl">
            <WifiOff size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-rose-400" />
            <p className="text-xs font-light leading-relaxed text-white/60" style={{ whiteSpace: 'pre-line' }}>
              {geoLoading
                ? 'GPS 신호 탐색 중...'
                : GEO_ERROR_MSG[geoError!]}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
