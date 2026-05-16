// MapDisplay.tsx
// 사전 요구: .env → VITE_MAPBOX_TOKEN=pk.xxx
import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Bike, Satellite } from 'lucide-react'
import { MOCK_ROUTE_COORDS, MOCK_CENTER, MOCK_ZOOM } from './mockData'
import type { Location, GpsStatus } from './types'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

interface Props {
  path: Location[]
  currentPosition: Location | null
  isRiding: boolean
  gpsStatus: GpsStatus
}

export default function MapDisplay({ path, currentPosition, isRiding, gpsStatus }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return

    mapboxgl.accessToken = TOKEN

    const center: [number, number] = currentPosition
      ? [currentPosition.lng, currentPosition.lat]
      : MOCK_CENTER

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center,
      zoom: MOCK_ZOOM,
      attributionControl: false,
      logoPosition: 'bottom-right',
      dragRotate: false,
      pitchWithRotate: false,
    })

    map.on('load', () => {
      map.addSource('mock-src', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: MOCK_ROUTE_COORDS },
          properties: {},
        },
      })
      map.addLayer({
        id: 'mock-route',
        type: 'line',
        source: 'mock-src',
        paint: {
          'line-color': '#2DD4BF',
          'line-width': 2,
          'line-opacity': 0.2,
          'line-dasharray': [2, 3],
        },
      })

      map.addSource('ride-src', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
      })
      map.addLayer({
        id: 'ride-glow',
        type: 'line',
        source: 'ride-src',
        paint: { 'line-color': '#2DD4BF', 'line-width': 12, 'line-opacity': 0.12, 'line-blur': 6 },
      })
      map.addLayer({
        id: 'ride-line',
        type: 'line',
        source: 'ride-src',
        paint: { 'line-color': '#2DD4BF', 'line-width': 3, 'line-opacity': 0.9 },
      })

      loadedRef.current = true
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      loadedRef.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentPosition || !mapRef.current) return
    mapRef.current.easeTo({
      center: [currentPosition.lng, currentPosition.lat],
      duration: 800,
      essential: true,
    })
  }, [currentPosition])

  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return
    const src = mapRef.current.getSource('ride-src') as mapboxgl.GeoJSONSource | undefined
    src?.setData({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: path.map((c) => [c.lng, c.lat]) },
      properties: {},
    })
  }, [path])

  const isConnected = gpsStatus === 'connected'

  const mapArea = TOKEN ? (
    <div ref={containerRef} className="h-full w-full" />
  ) : (
    <div
      className="h-full w-full bg-[#0b1120]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }}
    >
      <p className="absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 text-center text-[11px] font-light leading-relaxed text-white/20">
        .env 파일에 VITE_MAPBOX_TOKEN을<br />추가하면 실제 지도가 표시돼요
      </p>
    </div>
  )

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
    >
      {mapArea}

      {/* ── 바이크 센터 마커 ── */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          {/* 외곽 펄스 링 */}
          <span className="absolute inline-flex h-20 w-20 animate-ping rounded-full border border-teal-400/20 opacity-75" />
          {/* 중간 펄스 링 */}
          <span
            className="absolute inline-flex h-14 w-14 animate-ping rounded-full border border-teal-400/30 opacity-75"
            style={{ animationDelay: '0.45s' }}
          />
          {/* 유리 질감 카드 */}
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
