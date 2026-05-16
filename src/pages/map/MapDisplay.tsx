// MapDisplay.tsx
import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Bike, Satellite } from 'lucide-react'
import { MOCK_ROUTE_COORDS, MOCK_CENTER, MOCK_ZOOM } from './mockData'
import type { Location, GpsStatus } from './types'

interface Props {
  path: Location[]
  currentPosition: Location | null
  isRiding: boolean
  gpsStatus: GpsStatus
}

// Leaflet uses [lat, lng]; mockData is [lng, lat] (Mapbox convention)
const MOCK_ROUTE_LATLNG = MOCK_ROUTE_COORDS.map(([lng, lat]) => [lat, lng] as [number, number])
const MOCK_CENTER_LATLNG: [number, number] = [MOCK_CENTER[1], MOCK_CENTER[0]]

function CameraFollower({ position }: { position: Location | null }) {
  const map = useMap()
  useEffect(() => {
    if (!position) return
    map.panTo([position.lat, position.lng], { animate: true, duration: 0.8 })
  }, [position, map])
  return null
}

export default function MapDisplay({ path, currentPosition, isRiding, gpsStatus }: Props) {
  const ridePath = path.map((c) => [c.lat, c.lng] as [number, number])
  const isConnected = gpsStatus === 'connected'

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
    >
      <MapContainer
        center={MOCK_CENTER_LATLNG}
        zoom={MOCK_ZOOM}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        {/* 참고용 mock 루트 (흐릿한 점선) */}
        <Polyline
          positions={MOCK_ROUTE_LATLNG}
          pathOptions={{ color: '#2DD4BF', weight: 2, opacity: 0.2, dashArray: '5 7' }}
        />

        {/* 실제 주행 경로 — glow */}
        {ridePath.length > 1 && (
          <Polyline
            positions={ridePath}
            pathOptions={{ color: '#2DD4BF', weight: 12, opacity: 0.12 }}
          />
        )}

        {/* 실제 주행 경로 — 선명한 선 */}
        {ridePath.length > 1 && (
          <Polyline
            positions={ridePath}
            pathOptions={{ color: '#2DD4BF', weight: 3, opacity: 0.9 }}
          />
        )}

        <CameraFollower position={currentPosition} />
      </MapContainer>

      {/* ── 바이크 센터 마커 ── */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <span className="absolute inline-flex h-20 w-20 animate-ping rounded-full border border-teal-400/20 opacity-75" />
          <span
            className="absolute inline-flex h-14 w-14 animate-ping rounded-full border border-teal-400/30 opacity-75"
            style={{ animationDelay: '0.45s' }}
          />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#161B26]/70 backdrop-blur-md ring-1 ring-teal-400/30">
            <Bike size={20} strokeWidth={1.5} className="text-teal-400" />
          </div>
        </div>
      </div>

      {/* ── GPS 상태 표시등 (우측 상단) ── */}
      <div className="absolute right-4 top-4">
        <div className="flex items-center gap-1.5 rounded-full bg-[#161B26]/80 px-3 py-2 backdrop-blur-md">
          <Satellite
            size={13}
            strokeWidth={1.5}
            className={isConnected ? 'text-teal-400' : 'text-white/30'}
          />
          <span
            className={`text-[10px] font-light ${
              isConnected ? 'text-teal-400' : 'animate-pulse text-white/30'
            }`}
          >
            {isConnected ? 'GPS 수신 중' : 'GPS 재연결 중'}
          </span>
        </div>
      </div>

      {/* ── REC 인디케이터 (좌측 상단, 주행 중만) ── */}
      {isRiding && (
        <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-2 backdrop-blur-md">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
          <span className="text-[10px] font-bold tracking-widest text-rose-400">REC</span>
        </div>
      )}
    </div>
  )
}
