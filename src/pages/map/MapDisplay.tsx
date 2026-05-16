// MapDisplay.tsx
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet'
import type { Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Navigation, Satellite } from 'lucide-react'
import { MOCK_ROUTE_COORDS, MOCK_CENTER, MOCK_ZOOM } from './mockData'
import type { Location, GpsStatus } from './types'

function useHeading(): number {
  const [heading, setHeading] = useState(0)
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      // iOS: webkitCompassHeading (0=North, 시계방향 증가)
      // Android: alpha (0=North 기준 반시계, 반전 필요)
      const h =
        typeof (e as any).webkitCompassHeading === 'number'
          ? (e as any).webkitCompassHeading
          : e.alpha !== null
          ? (360 - e.alpha) % 360
          : 0
      setHeading(h)
    }
    window.addEventListener('deviceorientation', handler, true)
    return () => window.removeEventListener('deviceorientation', handler, true)
  }, [])
  return heading
}

interface Props {
  path: Location[]
  currentPosition: Location | null
  isRiding: boolean
  gpsStatus: GpsStatus
  mapRef?: React.MutableRefObject<LeafletMap | null>
}

function MapRefSetter({ mapRef }: { mapRef?: React.MutableRefObject<LeafletMap | null> }) {
  const map = useMap()
  useEffect(() => {
    if (mapRef) mapRef.current = map
  }, [map, mapRef])
  return null
}

// mockData는 [lng, lat] (Mapbox 관행) → Leaflet은 [lat, lng]
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

export default function MapDisplay({ path, currentPosition, isRiding, gpsStatus, mapRef }: Props) {
  const ridePath = path.map((c) => [c.lat, c.lng] as [number, number])
  const isConnected = gpsStatus === 'connected'
  const heading = useHeading()

  return (
    /* 지도 컨테이너 — 터치 패닝/줌은 허용, 부모가 바운스 차단 */
    <div className="h-full w-full" style={{ touchAction: 'pan-x pan-y pinch-zoom' }}>
      <MapContainer
        center={MOCK_CENTER_LATLNG}
        zoom={MOCK_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
        dragging={true}
        touchZoom={true}
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

        {/* 실제 주행 경로 glow */}
        {ridePath.length > 1 && (
          <Polyline
            positions={ridePath}
            pathOptions={{ color: '#2DD4BF', weight: 12, opacity: 0.12 }}
          />
        )}

        {/* 실제 주행 경로 선명한 선 */}
        {ridePath.length > 1 && (
          <Polyline
            positions={ridePath}
            pathOptions={{ color: '#2DD4BF', weight: 3, opacity: 0.9 }}
          />
        )}

        <CameraFollower position={currentPosition} />
        <MapRefSetter mapRef={mapRef} />
      </MapContainer>

      {/* ── 나침반 방향 화살표 마커 — z-[999]로 Leaflet 타일(z-200)·오버레이(z-400) 위에 강제 격상 ── */}
      <div className="pointer-events-none absolute inset-0 z-[999] flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          {/* 외곽 글로우 펄스 */}
          <span className="absolute inline-flex h-16 w-16 animate-ping rounded-full bg-teal-400/10 opacity-60" />
          {/* 내부 글로우 */}
          <span
            className="absolute inline-flex h-10 w-10 rounded-full bg-teal-400/15"
            style={{ filter: 'blur(6px)' }}
          />
          {/* 화살표 아이콘 — heading 값에 따라 실시간 회전 */}
          <div
            style={{
              transform: `rotate(${heading}deg)`,
              transition: 'transform 0.3s ease-out',
              filter: 'drop-shadow(0 0 8px #2dd4bf) drop-shadow(0 0 16px #2dd4bf88)',
            }}
          >
            <Navigation size={36} strokeWidth={2} className="text-teal-400" fill="#2DD4BF" />
          </div>
        </div>
      </div>

      {/* ── GPS 상태 표시등 (우측 상단) ── */}
      <div className="absolute right-4 top-4 z-10">
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
        <div className="absolute left-4 top-14 z-10 flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-2 backdrop-blur-md">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
          <span className="text-[10px] font-bold tracking-widest text-rose-400">REC</span>
        </div>
      )}
    </div>
  )
}
