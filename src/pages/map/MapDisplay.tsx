// MapDisplay.tsx — 카카오맵 기반 주행 지도
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { LocateFixed } from 'lucide-react'
import type { Location } from './types'
import RoadviewModal from '../../components/RoadviewModal'

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

// 현재 위치 CustomOverlay HTML — 카카오맵 좌표에 고정
function makeArrowContent(): HTMLElement {
  const wrap = document.createElement('div')
  wrap.style.cssText = `
    width: 44px; height: 44px;
    display: flex; align-items: center; justify-content: center;
    position: relative; pointer-events: none;
  `
  wrap.innerHTML = `
    <span style="
      position:absolute; width:56px; height:56px;
      border-radius:50%; background:rgba(45,212,191,0.10);
      animation: moto-ping 1.8s cubic-bezier(0,0,0.2,1) infinite;
    "></span>
    <span style="
      position:absolute; width:32px; height:32px;
      border-radius:50%; background:rgba(45,212,191,0.15);
      filter:blur(5px);
    "></span>
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
      fill="#2DD4BF" stroke="#2DD4BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      style="filter:drop-shadow(0 0 7px #2dd4bf) drop-shadow(0 0 14px #2dd4bf88); position:relative;">
      <polygon points="3 11 22 2 13 21 11 13 3 11"/>
    </svg>
  `
  // ping 애니메이션 — 글로벌 style 한 번만 삽입
  if (!document.getElementById('moto-ping-style')) {
    const s = document.createElement('style')
    s.id = 'moto-ping-style'
    s.textContent = `
      @keyframes moto-ping {
        0%   { transform: scale(0.9); opacity: 0.7; }
        70%  { transform: scale(1.6); opacity: 0;   }
        100% { transform: scale(0.9); opacity: 0;   }
      }
    `
    document.head.appendChild(s)
  }
  return wrap
}

export default function MapDisplay({ path, currentPosition, isRiding, mapRef }: Props) {
  const containerRef      = useRef<HTMLDivElement>(null)
  const mapInstanceRef    = useRef<any>(null)
  const glowLineRef       = useRef<any>(null)
  const mainLineRef       = useRef<any>(null)
  const arrowOverlayRef   = useRef<any>(null)
  const hasCenteredRef    = useRef(false)          // 최초 1회 내 위치로 이동
  const currentPosRef     = useRef<Location | null>(null)
  const [roadviewPos, setRoadviewPos] = useState<{ lat: number; lng: number } | null>(null)

  // ── 1. 카카오맵 초기화 ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    const doInit = () => {
      if (cancelled || !containerRef.current) return
      window.kakao.maps.load(() => {
        if (cancelled || !containerRef.current) return
        const map = new window.kakao.maps.Map(containerRef.current, {
          center: new window.kakao.maps.LatLng(36.5, 127.8),
          level: 3,
        })
        mapInstanceRef.current = map
        if (mapRef) mapRef.current = map

        // 컨테이너 크기 재계산 — SDK가 초기화 시 높이를 잘못 읽는 버그 방지
        requestAnimationFrame(() => { try { map.relayout() } catch {} })
        const onResize = () => { try { map.relayout() } catch {} }
        window.addEventListener('resize', onResize)

        // 위치 화살표 CustomOverlay 생성 (초기 위치는 지도 중심)
        const overlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(36.5, 127.8),
          content:  makeArrowContent(),
          xAnchor:  0.5,
          yAnchor:  0.5,
          zIndex:   10,
        })
        overlay.setMap(map)
        arrowOverlayRef.current = overlay

        // GPS 위치가 이미 수신된 경우 즉시 반영
        if (currentPosRef.current) {
          const { lat, lng } = currentPosRef.current
          const ll = new window.kakao.maps.LatLng(lat, lng)
          overlay.setPosition(ll)
          map.setCenter(ll)
          hasCenteredRef.current = true
        }

        // ── 롱프레스 → 로드뷰 ──────────────────────────────────────
        let downX = 0, downY = 0
        let lpTimer: ReturnType<typeof setTimeout> | null = null
        const cancelLP = () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null } }

        const startLP = (cx: number, cy: number) => {
          cancelLP(); downX = cx; downY = cy
          lpTimer = setTimeout(() => {
            lpTimer = null
            if (navigator.vibrate) navigator.vibrate(40)
            try {
              const rect = containerRef.current!.getBoundingClientRect()
              const proj = map.getProjection()
              const ll   = proj.coordsFromContainerPoint(
                new window.kakao.maps.Point(cx - rect.left, cy - rect.top)
              )
              setRoadviewPos({ lat: ll.getLat(), lng: ll.getLng() })
            } catch {}
          }, 600)
        }
        const moveLP = (cx: number, cy: number) => {
          if (Math.abs(cx - downX) > 10 || Math.abs(cy - downY) > 10) cancelLP()
        }

        containerRef.current!.addEventListener('mousedown',   e => startLP(e.clientX, e.clientY))
        containerRef.current!.addEventListener('mousemove',   e => moveLP(e.clientX, e.clientY))
        containerRef.current!.addEventListener('mouseup',     cancelLP)
        containerRef.current!.addEventListener('touchstart',  e => {
          const t = e.touches[0]; startLP(t.clientX, t.clientY)
        }, { passive: true })
        containerRef.current!.addEventListener('touchmove',   e => {
          const t = e.touches[0]; moveLP(t.clientX, t.clientY)
        }, { passive: true })
        containerRef.current!.addEventListener('touchend',    cancelLP)
        containerRef.current!.addEventListener('touchcancel', cancelLP)
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
      mapInstanceRef.current = null
      arrowOverlayRef.current = null
    }
  }, [])

  // ── 2. 주행 경로 폴리라인 실시간 업데이트 ─────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !window.kakao?.maps) return

    if (glowLineRef.current) glowLineRef.current.setMap(null)
    if (mainLineRef.current)  mainLineRef.current.setMap(null)

    if (path.length < 2) return

    const linePath = path.map(p => new window.kakao.maps.LatLng(p.lat, p.lng))

    glowLineRef.current = new window.kakao.maps.Polyline({
      path: linePath, strokeWeight: 12,
      strokeColor: '#2DD4BF', strokeOpacity: 0.15, strokeStyle: 'solid',
    })
    glowLineRef.current.setMap(mapInstanceRef.current)

    mainLineRef.current = new window.kakao.maps.Polyline({
      path: linePath, strokeWeight: 4,
      strokeColor: '#2DD4BF', strokeOpacity: 0.9, strokeStyle: 'solid',
    })
    mainLineRef.current.setMap(mapInstanceRef.current)
  }, [path])

  // ── 3. GPS 위치 업데이트 → 화살표 이동 + 조건부 panTo ─────────────
  useEffect(() => {
    currentPosRef.current = currentPosition
    if (!currentPosition || !window.kakao?.maps) return

    const latlng = new window.kakao.maps.LatLng(currentPosition.lat, currentPosition.lng)

    // 화살표 오버레이 위치 갱신
    if (arrowOverlayRef.current) {
      arrowOverlayRef.current.setPosition(latlng)
    }

    if (!mapInstanceRef.current) return

    // 최초 1회 또는 주행 중 → 지도 따라가기
    if (!hasCenteredRef.current || isRiding) {
      mapInstanceRef.current.panTo(latlng)
      hasCenteredRef.current = true
    }
  }, [currentPosition, isRiding])

  // ── 4. 주행 중 지도 잠금 ──────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return
    mapInstanceRef.current.setDraggable(!isRiding)
    mapInstanceRef.current.setZoomable(!isRiding)
  }, [isRiding])

  // ── 현재위치 버튼 핸들러 ──────────────────────────────────────────
  const handleLocate = () => {
    if (!mapInstanceRef.current || !currentPosRef.current || !window.kakao?.maps) return
    const { lat, lng } = currentPosRef.current
    mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(lat, lng))
  }

  return (
    <div className="relative h-full w-full" style={{ touchAction: 'pan-x pan-y pinch-zoom' }}>

      {/* 로드뷰 팝업 */}
      <AnimatePresence>
        {roadviewPos && (
          <RoadviewModal
            lat={roadviewPos.lat}
            lng={roadviewPos.lng}
            onClose={() => setRoadviewPos(null)}
          />
        )}
      </AnimatePresence>

      {/* 카카오맵 컨테이너 */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* REC 인디케이터 (주행 중만) */}
      {isRiding && (
        <div className="absolute left-4 top-14 z-10 flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-2 backdrop-blur-md">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
          <span className="text-[10px] font-bold tracking-widest text-rose-400">REC</span>
        </div>
      )}

      {/* 현재위치 버튼 — 우하단 */}
      <button
        onClick={handleLocate}
        className="absolute bottom-44 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 shadow-lg backdrop-blur-md active:opacity-70"
      >
        <LocateFixed size={20} strokeWidth={1.8} className="text-teal-400" />
      </button>
    </div>
  )
}
