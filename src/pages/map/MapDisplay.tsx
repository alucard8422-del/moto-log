// MapDisplay.tsx
// 필수: .env 파일에 VITE_MAPBOX_TOKEN=pk.xxx 추가
import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Navigation2, WifiOff } from 'lucide-react'
import { MOCK_ROUTE_COORDS, MOCK_CENTER, MOCK_ZOOM } from './mockData'
import { GEO_ERROR_MSG } from './useGeolocation'
import type { Location, GeoErrorCode } from './types'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

interface Props {
  path: Location[]
  currentPosition: Location | null
  isRiding: boolean
  geoError: GeoErrorCode | null
  geoLoading: boolean
}

function injectPulseCSS() {
  if (document.getElementById('mb-pulse')) return
  const style = document.createElement('style')
  style.id = 'mb-pulse'
  style.textContent = `
    .mb-pos-dot { width:18px; height:18px; border-radius:50%; background:#2DD4BF;
      border:2.5px solid #fff; box-shadow:0 0 14px rgba(45,212,191,0.65); position:relative; }
    .mb-pos-ring { position:absolute; inset:-9px; border-radius:50%;
      border:2px solid rgba(45,212,191,0.45);
      animation: mbPulse 2s ease-out infinite; }
    @keyframes mbPulse {
      0%   { transform:scale(0.6); opacity:0.8; }
      100% { transform:scale(2.2); opacity:0; }
    }
  `
  document.head.appendChild(style)
}

export default function MapDisplay({ path, currentPosition, isRiding, geoError, geoLoading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const loadedRef = useRef(false)

  // 지도 초기화
  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return

    mapboxgl.accessToken = TOKEN
    injectPulseCSS()

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
      // 샘플 GPX 경로 (배경 참조용)
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
          'line-opacity': 0.22,
          'line-dasharray': [2, 3],
        },
      })

      // 실시간 GPS 경로
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

    // 현재 위치 마커 (pulsing)
    const el = document.createElement('div')
    el.innerHTML = '<div class="mb-pos-dot"><div class="mb-pos-ring"></div></div>'

    const marker = new mapboxgl.Marker({ element: el.firstElementChild as HTMLElement, anchor: 'center' })
      .setLngLat(center)
      .addTo(map)

    markerRef.current = marker
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      loadedRef.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 현재 위치 마커 업데이트
  useEffect(() => {
    if (!currentPosition || !mapRef.current || !markerRef.current) return
    const ll: [number, number] = [currentPosition.lng, currentPosition.lat]
    markerRef.current.setLngLat(ll)
    mapRef.current.easeTo({ center: ll, duration: 800, essential: true })
  }, [currentPosition])

  // 라이딩 GPX 경로 업데이트
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return
    const src = mapRef.current.getSource('ride-src') as mapboxgl.GeoJSONSource | undefined
    src?.setData({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: path.map((c) => [c.lng, c.lat]) },
      properties: {},
    })
  }, [path])

  // Mapbox 토큰 없음 → 폴백 플레이스홀더
  if (!TOKEN) {
    return (
      <div
        className="relative h-full w-full overflow-hidden bg-[#0b1120]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="text-xs font-light text-white/25">
            .env 파일에 VITE_MAPBOX_TOKEN을<br />추가하면 실제 지도가 표시돼요
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full" style={{ touchAction: 'pan-x pan-y pinch-zoom' }}>
      <div ref={containerRef} className="h-full w-full" />

      {/* 나침반 */}
      <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#161B26]/80 backdrop-blur-md">
        <Navigation2 size={16} strokeWidth={1.5} className="text-teal-400" />
      </div>

      {/* GPS 오류/로딩 오버레이 */}
      {(geoError || geoLoading) && (
        <div className="absolute left-1/2 top-5 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-2xl bg-[#161B26]/90 px-4 py-3 backdrop-blur-xl">
            <WifiOff size={12} strokeWidth={1.5} className={geoError ? 'text-rose-400' : 'text-white/40'} />
            <p className="whitespace-pre-line text-[11px] font-light leading-relaxed text-white/55">
              {geoLoading ? 'GPS 신호 탐색 중...' : GEO_ERROR_MSG[geoError!]}
            </p>
          </div>
        </div>
      )}

      {/* 주행 중 인디케이터 */}
      {isRiding && (
        <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1.5 backdrop-blur-md">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
          <span className="text-[10px] font-bold text-rose-400">REC</span>
        </div>
      )}
    </div>
  )
}
