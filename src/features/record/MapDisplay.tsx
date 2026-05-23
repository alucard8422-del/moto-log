// MapDisplay.tsx — 카카오맵 기반 주행 지도
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { LocateFixed, Satellite, WifiOff, Loader2, X } from 'lucide-react'
import type { Location, GeoErrorCode } from './types'
import RoadviewModal from '../../components/RoadviewModal'
import { GEO_ERROR_MSG } from './useGeolocation'

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
  gpsLoading?: boolean
  gpsError?: GeoErrorCode | null
}

// 현재 위치 CustomOverlay — 원형 나침반 스타일, 방향 화살표 회전 가능
function makeCompassOverlay(): { wrap: HTMLElement; arrowEl: HTMLElement } {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'width:48px;height:48px;display:flex;align-items:center;justify-content:center;position:relative;pointer-events:none'

  const ping = document.createElement('span')
  ping.style.cssText = 'position:absolute;width:62px;height:62px;border-radius:50%;background:rgba(255,90,0,0.12);animation:moto-ping 1.8s cubic-bezier(0,0,0.2,1) infinite'

  // 나침반 heading 회전 적용 대상
  const arrowEl = document.createElement('div')
  arrowEl.style.cssText = 'position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;will-change:transform'
  arrowEl.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44" style="position:absolute;top:0;left:0;overflow:visible">
      <!-- 외부 원 -->
      <circle cx="22" cy="22" r="16" fill="rgba(255,90,0,0.18)" stroke="#FF5A00" stroke-width="1.8" stroke-opacity="0.75"/>
      <!-- 중심 점 -->
      <circle cx="22" cy="22" r="5.5" fill="#FF5A00" style="filter:drop-shadow(0 0 5px #FF5A00)"/>
      <!-- 방향 화살표 (위 = 북쪽/heading 0) -->
      <polygon points="22,3 26.5,14 22,11 17.5,14" fill="#FF5A00" style="filter:drop-shadow(0 0 4px #FF5A00aa)"/>
    </svg>
  `

  wrap.appendChild(ping)
  wrap.appendChild(arrowEl)

  if (!document.getElementById('moto-ping-style')) {
    const s = document.createElement('style')
    s.id = 'moto-ping-style'
    s.textContent = '@keyframes moto-ping{0%{transform:scale(0.9);opacity:0.7}70%{transform:scale(1.6);opacity:0}100%{transform:scale(0.9);opacity:0}}'
    document.head.appendChild(s)
  }

  return { wrap, arrowEl }
}

export default function MapDisplay({ path, currentPosition, isRiding, mapRef, gpsLoading, gpsError }: Props) {
  const containerRef      = useRef<HTMLDivElement>(null)
  const mapInstanceRef    = useRef<any>(null)
  const glowLineRef       = useRef<any>(null)
  const mainLineRef       = useRef<any>(null)
  const arrowOverlayRef   = useRef<any>(null)
  const hasCenteredRef    = useRef(false)          // 최초 1회 내 위치로 이동
  const currentPosRef     = useRef<Location | null>(null)
  const arrowElRef        = useRef<HTMLElement | null>(null)       // 나침반 회전 대상 DOM
  const compassHandlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null)
  const targetPosRef      = useRef<{ lat: number; lng: number } | null>(null)  // RAF 목표 위치
  const animPosRef        = useRef<{ lat: number; lng: number } | null>(null)  // RAF 현재 보간 위치
  const rafRef            = useRef<number | null>(null)
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

        // 위치 화살표 CustomOverlay 생성 (나침반 회전 가능)
        const { wrap: arrowWrap, arrowEl } = makeCompassOverlay()
        arrowElRef.current = arrowEl
        const overlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(36.5, 127.8),
          content:  arrowWrap,
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
          animPosRef.current   = { lat, lng }
          targetPosRef.current = { lat, lng }
          map.setCenter(ll)
          hasCenteredRef.current = true
        }

        // ── 마커 부드러운 이동: RAF 보간 루프 ─────────────────────────────
        // GPS 업데이트(1~2초 간격)마다 target만 변경, RAF가 매 프레임 lerp 이동
        const LERP = 0.14   // 60fps 기준 ~0.5초 내 99% 도달
        const THRESHOLD = 1e-8  // 이 이하 차이면 이동 생략
        const animateMarker = () => {
          const tgt = targetPosRef.current
          const cur = animPosRef.current
          if (tgt && cur && arrowOverlayRef.current && window.kakao?.maps) {
            const dLat = tgt.lat - cur.lat
            const dLng = tgt.lng - cur.lng
            if (Math.abs(dLat) > THRESHOLD || Math.abs(dLng) > THRESHOLD) {
              const next = {
                lat: cur.lat + dLat * LERP,
                lng: cur.lng + dLng * LERP,
              }
              animPosRef.current = next
              arrowOverlayRef.current.setPosition(
                new window.kakao.maps.LatLng(next.lat, next.lng)
              )
            }
          }
          rafRef.current = requestAnimationFrame(animateMarker)
        }
        rafRef.current = requestAnimationFrame(animateMarker)

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
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      mapInstanceRef.current = null
      arrowOverlayRef.current = null
    }
  }, [])

  // ── 2. 나침반 heading → 화살표 회전 ──────────────────────────────
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      const ev = e as DeviceOrientationEvent & { webkitCompassHeading?: number }
      let heading = 0
      if (typeof ev.webkitCompassHeading === 'number') {
        heading = ev.webkitCompassHeading           // iOS: 자북 기준 시계방향 °
      } else if (e.alpha !== null && e.alpha !== undefined) {
        heading = (360 - e.alpha) % 360             // Android: 반시계 → 시계 변환
      }
      if (arrowElRef.current) {
        arrowElRef.current.style.transform = `rotate(${heading}deg)`
      }
    }
    compassHandlerRef.current = handler

    const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<string>
    }
    if (typeof DOE.requestPermission === 'function') {
      // iOS 13+ — 유저 제스처 없이는 실패할 수 있음 (현재위치 버튼 탭 시 재시도)
      DOE.requestPermission()
        .then(r => { if (r === 'granted') window.addEventListener('deviceorientation', handler, true) })
        .catch(() => {})
    } else {
      window.addEventListener('deviceorientation', handler, true)
    }
    return () => window.removeEventListener('deviceorientation', handler, true)
  }, [])

  // ── 3. 주행 경로 폴리라인 실시간 업데이트 ─────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !window.kakao?.maps) return

    if (glowLineRef.current) glowLineRef.current.setMap(null)
    if (mainLineRef.current)  mainLineRef.current.setMap(null)

    if (path.length < 2) return

    const linePath = path.map(p => new window.kakao.maps.LatLng(p.lat, p.lng))

    glowLineRef.current = new window.kakao.maps.Polyline({
      path: linePath, strokeWeight: 12,
      strokeColor: '#FF5A00', strokeOpacity: 0.18, strokeStyle: 'solid',
    })
    glowLineRef.current.setMap(mapInstanceRef.current)

    mainLineRef.current = new window.kakao.maps.Polyline({
      path: linePath, strokeWeight: 4,
      strokeColor: '#FF5A00', strokeOpacity: 0.95, strokeStyle: 'solid',
    })
    mainLineRef.current.setMap(mapInstanceRef.current)
  }, [path])

  // ── 4. GPS 위치 업데이트 → RAF 목표 위치 설정 + 조건부 panTo ───────────
  // 마커 실제 이동은 RAF 루프가 lerp 보간 처리 (버그3 수정)
  // EMA 제거로 경로 선 끝과 마커가 동일 위치를 가리킴 (버그1 수정)
  useEffect(() => {
    currentPosRef.current = currentPosition
    if (!currentPosition || !window.kakao?.maps) return

    const { lat, lng } = currentPosition

    // RAF 목표 위치 갱신 (부드러운 보간을 위해 setPosition 직접 호출 안 함)
    targetPosRef.current = { lat, lng }
    // 최초 위치(animPos 미설정)이면 즉시 스냅
    if (!animPosRef.current) {
      animPosRef.current = { lat, lng }
      if (arrowOverlayRef.current) {
        arrowOverlayRef.current.setPosition(new window.kakao.maps.LatLng(lat, lng))
      }
    }

    if (!mapInstanceRef.current) return

    // 최초 1회 또는 주행 중 → 지도 따라가기
    if (!hasCenteredRef.current || isRiding) {
      mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(lat, lng))
      hasCenteredRef.current = true
    }
  }, [currentPosition, isRiding])

  // ── 4. 주행 중 지도 잠금 ──────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return
    mapInstanceRef.current.setDraggable(!isRiding)
    mapInstanceRef.current.setZoomable(!isRiding)
  }, [isRiding])

  // ── 현재위치 버튼 핸들러 (iOS 나침반 권한 요청 포함) ─────────────────
  const handleLocate = () => {
    // iOS 13+ 나침반 권한 — 유저 탭이 제스처로 인정됨
    const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<string>
    }
    if (typeof DOE.requestPermission === 'function' && compassHandlerRef.current) {
      DOE.requestPermission()
        .then(r => {
          if (r === 'granted' && compassHandlerRef.current)
            window.addEventListener('deviceorientation', compassHandlerRef.current, true)
        })
        .catch(() => {})
    }
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

      {/* 지도 위 화이트 틴트 — 지도가 너무 도드라지지 않게 */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.4)', pointerEvents: 'none', zIndex: 1 }} />


      {/* GPS 상태 버튼 — 현재위치 버튼 위 */}
      <GpsStatusButton gpsLoading={gpsLoading} gpsError={gpsError} />

      {/* 현재위치 버튼 — 우하단 */}
      <button
        onClick={handleLocate}
        className="absolute bottom-44 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 shadow-lg backdrop-blur-md active:opacity-70"
      >
        <LocateFixed size={20} strokeWidth={1.8} className="text-[#FF5A00]" />
      </button>
    </div>
  )
}

// ── GPS 상태 버튼 + 팝업 ─────────────────────────────────────────────────────
function GpsStatusButton({ gpsLoading, gpsError }: { gpsLoading?: boolean; gpsError?: GeoErrorCode | null }) {
  const [showPopup, setShowPopup] = useState(false)

  const isOk      = !gpsLoading && !gpsError
  const isLoading = gpsLoading

  const iconColor = isLoading ? '#94A3B8' : isOk ? '#22C55E' : '#EF4444'
  const bgStyle   = isLoading
    ? 'rgba(148,163,184,0.15)'
    : isOk
    ? 'rgba(34,197,94,0.15)'
    : 'rgba(239,68,68,0.15)'
  const borderStyle = isLoading
    ? 'rgba(148,163,184,0.3)'
    : isOk
    ? 'rgba(34,197,94,0.3)'
    : 'rgba(239,68,68,0.3)'

  const statusText = isLoading ? 'GPS 연결 중...' : isOk ? 'GPS 정상 연결됨' : 'GPS 연결 끊김'
  const detailText = isLoading
    ? '위성 신호를 탐색하고 있습니다'
    : isOk
    ? '위치 정보를 정상적으로 수신 중입니다'
    : (gpsError ? GEO_ERROR_MSG[gpsError] : '')

  return (
    <>
      {/* GPS 아이콘 버튼 */}
      <button
        onClick={() => setShowPopup(v => !v)}
        className="absolute right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full shadow-lg backdrop-blur-md active:opacity-70"
        style={{ bottom: '15rem', border: `1px solid ${borderStyle}`, background: bgStyle }}
      >
        {isLoading
          ? <Loader2 size={20} strokeWidth={1.8} color={iconColor} className="animate-spin" />
          : isOk
          ? <Satellite size={20} strokeWidth={1.8} color={iconColor} />
          : <WifiOff size={20} strokeWidth={1.8} color={iconColor} />
        }
      </button>

      {/* 팝업 */}
      {showPopup && (
        <>
          <div className="fixed inset-0 z-[50]" onClick={() => setShowPopup(false)} />
          <div
            className="absolute right-16 z-[51] w-56 rounded-2xl p-4 shadow-2xl"
            style={{ bottom: '15rem', background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(16px)' }}
          >
            <button
              onClick={() => setShowPopup(false)}
              className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <X size={12} strokeWidth={1.5} className="text-white/50" />
            </button>
            <div className="mb-2 flex items-center gap-2">
              {isLoading
                ? <Loader2 size={14} color={iconColor} className="animate-spin" />
                : isOk
                ? <Satellite size={14} color={iconColor} />
                : <WifiOff size={14} color={iconColor} />
              }
              <span className="text-[12px] font-bold" style={{ color: iconColor }}>{statusText}</span>
            </div>
            <p className="text-[11px] font-light leading-relaxed text-white/40" style={{ whiteSpace: 'pre-line' }}>
              {detailText}
            </p>
          </div>
        </>
      )}
    </>
  )
}
