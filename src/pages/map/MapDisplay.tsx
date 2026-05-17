// MapDisplay.tsx — 카카오맵 기반 주행 지도
import { useEffect, useRef, useState } from 'react'
import { Navigation } from 'lucide-react'
import type { Location } from './types'

const KAKAO_APP_KEY = 'd2430786a3a92cc28ebf4f0a22993062'

declare global {
  interface Window {
    kakao: any
  }
}

interface Props {
  path: Location[]
  currentPosition: Location | null
  isRiding: boolean
  mapRef?: React.MutableRefObject<any>
}

function useHeading(): number {
  const [heading, setHeading] = useState(0)
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
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

export default function MapDisplay({ path, currentPosition, isRiding, mapRef }: Props) {
  const containerRef    = useRef<HTMLDivElement>(null)
  const mapInstanceRef  = useRef<any>(null)
  const glowLineRef     = useRef<any>(null)
  const mainLineRef     = useRef<any>(null)
  const heading         = useHeading()

  // ── 1. 카카오맵 초기화 ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    const doInit = () => {
      if (cancelled || !containerRef.current) return
      window.kakao.maps.load(() => {
        if (cancelled || !containerRef.current) return
        const map = new window.kakao.maps.Map(containerRef.current, {
          center: new window.kakao.maps.LatLng(36.5, 127.8),
          level: 8,
        })
        mapInstanceRef.current = map
        if (mapRef) mapRef.current = map
      })
    }

    const scriptId = 'kakao-map-script'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    if (window.kakao) {
      doInit()
    } else if (script) {
      script.addEventListener('load', doInit)
    } else {
      script = document.createElement('script')
      script.id = scriptId
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`
      script.addEventListener('load', doInit)
      document.head.appendChild(script)
    }

    return () => {
      cancelled = true
      // 이전 맵 인스턴스 정리
      mapInstanceRef.current = null
    }
  }, [])

  // ── 2. 주행 경로 폴리라인 실시간 업데이트 ─────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !window.kakao?.maps) return

    // 기존 선 제거
    if (glowLineRef.current) glowLineRef.current.setMap(null)
    if (mainLineRef.current)  mainLineRef.current.setMap(null)

    if (path.length < 2) return

    const linePath = path.map(p => new window.kakao.maps.LatLng(p.lat, p.lng))

    // 글로우 (두껍고 반투명)
    glowLineRef.current = new window.kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 12,
      strokeColor: '#2DD4BF',
      strokeOpacity: 0.15,
      strokeStyle: 'solid',
    })
    glowLineRef.current.setMap(mapInstanceRef.current)

    // 선명한 메인 라인
    mainLineRef.current = new window.kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 4,
      strokeColor: '#2DD4BF',
      strokeOpacity: 0.9,
      strokeStyle: 'solid',
    })
    mainLineRef.current.setMap(mapInstanceRef.current)
  }, [path])

  // ── 3. 현재 위치 따라가기 ─────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !window.kakao?.maps || !currentPosition) return
    const latlng = new window.kakao.maps.LatLng(currentPosition.lat, currentPosition.lng)
    mapInstanceRef.current.panTo(latlng)
  }, [currentPosition])

  return (
    <div className="relative h-full w-full" style={{ touchAction: 'pan-x pan-y pinch-zoom' }}>

      {/* 카카오맵 컨테이너 */}
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* 현재 위치 방향 화살표 오버레이 (지도 중앙 고정) */}
      <div className="pointer-events-none absolute inset-0 z-[999] flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          {/* 글로우 펄스 */}
          <span className="absolute inline-flex h-16 w-16 animate-ping rounded-full bg-teal-400/10 opacity-60" />
          {/* 내부 블러 */}
          <span
            className="absolute inline-flex h-10 w-10 rounded-full bg-teal-400/15"
            style={{ filter: 'blur(6px)' }}
          />
          {/* 나침반 화살표 — heading 에 따라 회전 */}
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

      {/* REC 인디케이터 (주행 중만) */}
      {isRiding && (
        <div className="absolute left-4 top-14 z-10 flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-2 backdrop-blur-md">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
          <span className="text-[10px] font-bold tracking-widest text-rose-400">REC</span>
        </div>
      )}
    </div>
  )
}
