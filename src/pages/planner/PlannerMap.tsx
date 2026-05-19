// PlannerMap.tsx — 경로 작성 지도 컴포넌트
//
// Props
//  points    — 사용자가 찍은 경유지 (마커 렌더링에 사용)
//  routePath — 도로 경로 좌표 배열 (폴리라인 렌더링에 사용, 없으면 points 사용)
//
// 이벤트 규칙
//  짧은 탭: 마커 위 → onMarkerTap / 빈 곳 → onAddPoint / 말풍선 열림 → onDismissBubble
//  꾹 누르기(600ms): 어디서든 → onLongPress (로드뷰)

import { useEffect, useRef, useState } from 'react'
import { KAKAO_APP_KEY, type LatLng } from '../routes/routeUtils'
import { makeMarkerDataUrl } from './plannerUtils'

declare global { interface Window { kakao: any } }

interface Props {
  points:           LatLng[]
  routePath:        LatLng[]   // 실제 도로 경로 (비어있으면 points 직선 사용)
  locked:           boolean
  deleteTargetOpen: boolean
  onAddPoint:       (lat: number, lng: number) => void
  onMarkerTap:      (idx: number, screenX: number, screenY: number) => void
  onLongPress:      (lat: number, lng: number) => void
  onDismissBubble:  () => void
}

export default function PlannerMap({
  points, routePath, locked, deleteTargetOpen,
  onAddPoint, onMarkerTap, onLongPress, onDismissBubble,
}: Props) {
  const containerRef    = useRef<HTMLDivElement>(null)
  const mapRef          = useRef<any>(null)
  const markersRef      = useRef<any[]>([])
  const polylineGlowRef = useRef<any>(null)
  const polylineMainRef = useRef<any>(null)
  const initDoneRef     = useRef(false)
  const [mapReady, setMapReady] = useState(false)

  // 이벤트 클로저용 최신 값 refs
  const pointsRef     = useRef<LatLng[]>(points)
  const lockedRef     = useRef(locked)
  const deleteOpenRef = useRef(deleteTargetOpen)
  const cbRef         = useRef({ onAddPoint, onMarkerTap, onLongPress, onDismissBubble })

  useEffect(() => { pointsRef.current     = points          }, [points])
  useEffect(() => { lockedRef.current     = locked          }, [locked])
  useEffect(() => { deleteOpenRef.current = deleteTargetOpen }, [deleteTargetOpen])
  useEffect(() => { cbRef.current = { onAddPoint, onMarkerTap, onLongPress, onDismissBubble } })

  // ── 카카오맵 초기화 (최초 1회) ─────────────────────────────────────────────
  useEffect(() => {
    if (initDoneRef.current) return

    const doCreate = () => {
      if (initDoneRef.current || !containerRef.current) return
      initDoneRef.current = true

      window.kakao.maps.load(() => {
        if (!containerRef.current) return

        const map = new window.kakao.maps.Map(containerRef.current, {
          center: new window.kakao.maps.LatLng(36.3504, 127.3845),
          level: 7,
        })
        mapRef.current = map
        setMapReady(true)

        // ── 마커 근접 판별 ────────────────────────────────────────────
        const getMarkerPt = (proj: any, ll: any) => {
          try { return proj.containerPointFromCoords(ll) } catch {}
          try { return proj.pointFromCoords(ll)          } catch {}
          return null
        }
        const hitTestMarker = (cx: number, cy: number) => {
          const proj = map.getProjection()
          for (let i = 0; i < pointsRef.current.length; i++) {
            const p  = pointsRef.current[i]
            const pt = getMarkerPt(proj, new window.kakao.maps.LatLng(p.lat, p.lng))
            if (!pt) continue
            if (Math.sqrt((cx - pt.x) ** 2 + (cy - pt.y) ** 2) < 22)
              return { idx: i, ptX: pt.x, ptY: pt.y }
          }
          return null
        }

        // ── 좌표 변환 ────────────────────────────────────────────────
        const toLatLng = (cx: number, cy: number) =>
          map.getProjection().coordsFromContainerPoint(
            new window.kakao.maps.Point(cx, cy)
          )

        // ── 롱프레스(600ms) → 로드뷰 ────────────────────────────────
        let downX = 0, downY = 0
        let lpTimer: ReturnType<typeof setTimeout> | null = null
        const cancelLP = () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null } }

        const startLP = (cx: number, cy: number) => {
          cancelLP()
          downX = cx; downY = cy
          lpTimer = setTimeout(() => {
            lpTimer = null
            if (navigator.vibrate) navigator.vibrate(40)
            try {
              const rect = containerRef.current!.getBoundingClientRect()
              const ll   = toLatLng(cx - rect.left, cy - rect.top)
              cbRef.current.onLongPress(ll.getLat(), ll.getLng())
            } catch {}
          }, 600)
        }
        const moveLP = (cx: number, cy: number) => {
          if (Math.abs(cx - downX) > 10 || Math.abs(cy - downY) > 10) cancelLP()
        }

        // ── 탭 처리 ──────────────────────────────────────────────────
        const handleTap = (clientX: number, clientY: number) => {
          if (lockedRef.current) return
          const rect = containerRef.current!.getBoundingClientRect()
          const cx   = clientX - rect.left
          const cy   = clientY - rect.top
          const hit  = hitTestMarker(cx, cy)

          if (hit) {
            cbRef.current.onMarkerTap(hit.idx, clientX, clientY)
            return
          }
          if (deleteOpenRef.current) {
            cbRef.current.onDismissBubble()
            return
          }
          try {
            const ll = toLatLng(cx, cy)
            cbRef.current.onAddPoint(ll.getLat(), ll.getLng())
          } catch (err) { console.warn('[PlannerMap] 좌표 변환 오류:', err) }
        }

        // ── 마우스 이벤트 ────────────────────────────────────────────
        const el = containerRef.current!
        el.addEventListener('mousedown', e => startLP(e.clientX, e.clientY))
        el.addEventListener('mousemove', e => moveLP(e.clientX, e.clientY))
        el.addEventListener('mouseup', e => {
          const wasShort = lpTimer !== null
          cancelLP()
          if (wasShort && Math.abs(e.clientX - downX) <= 8 && Math.abs(e.clientY - downY) <= 8)
            handleTap(e.clientX, e.clientY)
          else if (deleteOpenRef.current)
            cbRef.current.onDismissBubble()
        })

        // ── 터치 이벤트 ──────────────────────────────────────────────
        el.addEventListener('touchstart', e => {
          const t = e.touches[0]; startLP(t.clientX, t.clientY)
        }, { passive: true })
        el.addEventListener('touchmove', e => {
          const t = e.touches[0]; moveLP(t.clientX, t.clientY)
        }, { passive: true })
        el.addEventListener('touchend', e => {
          // preventDefault: 터치 후 브라우저가 합성하는 mousedown/mouseup을 차단
          // → "마커 추가 직후 삭제 팝업" 이중 이벤트 버그 방지
          e.preventDefault()
          const wasShort = lpTimer !== null
          cancelLP()
          const t = e.changedTouches[0]
          if (wasShort && Math.abs(t.clientX - downX) <= 8 && Math.abs(t.clientY - downY) <= 8)
            handleTap(t.clientX, t.clientY)
          else if (deleteOpenRef.current)
            cbRef.current.onDismissBubble()
        })
        el.addEventListener('touchcancel', cancelLP)
      })
    }

    const scriptId = 'kakao-map-script'
    if (window.kakao?.maps?.Map) doCreate()
    else if (window.kakao)        window.kakao.maps.load(doCreate)
    else {
      let s = document.getElementById(scriptId) as HTMLScriptElement | null
      if (!s) {
        s = document.createElement('script')
        s.id  = scriptId
        s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`
        document.head.appendChild(s)
      }
      s.addEventListener('load', () => window.kakao.maps.load(doCreate))
    }
  }, [])

  // ── 마커 갱신 (points 변경 시) ────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.kakao?.maps) return

    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    points.forEach((p, i) => {
      const ll      = new window.kakao.maps.LatLng(p.lat, p.lng)
      const isStart = i === 0
      const isEnd   = i === points.length - 1 && points.length > 1
      const label   = isStart ? 'S' : isEnd ? 'E' : String(i)
      const bg      = isStart ? '#2DD4BF' : isEnd ? '#F87171' : '#1E293B'
      const fg      = isStart ? '#0F172A' : '#ffffff'

      const markerImage = new window.kakao.maps.MarkerImage(
        makeMarkerDataUrl(label, bg, fg),
        new window.kakao.maps.Size(32, 32),
        { offset: new window.kakao.maps.Point(16, 16) },
      )
      const marker = new window.kakao.maps.Marker({
        position: ll, image: markerImage, map: mapRef.current,
      })
      markersRef.current.push(marker)
    })
  }, [points, mapReady])

  // ── 폴리라인 갱신 (routePath 또는 points 변경 시) ─────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.kakao?.maps) return

    if (polylineGlowRef.current) polylineGlowRef.current.setMap(null)
    if (polylineMainRef.current) polylineMainRef.current.setMap(null)

    // routePath 가 있으면 도로 경로, 없으면 직선
    const linePts = routePath.length >= 2 ? routePath : points
    if (linePts.length < 2) return

    const path = linePts.map(p => new window.kakao.maps.LatLng(p.lat, p.lng))

    polylineGlowRef.current = new window.kakao.maps.Polyline({
      path, strokeWeight: 12, strokeColor: '#2DD4BF',
      strokeOpacity: 0.15, strokeStyle: 'solid',
    })
    polylineMainRef.current = new window.kakao.maps.Polyline({
      path, strokeWeight: 3, strokeColor: '#2DD4BF',
      strokeOpacity: 0.9, strokeStyle: 'solid',
    })
    polylineGlowRef.current.setMap(mapRef.current)
    polylineMainRef.current.setMap(mapRef.current)
  }, [routePath, points, mapReady])

  // ── CONFIRM 단계: 드래그 · 줌 잠금 ────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setDraggable(!locked)
    mapRef.current.setZoomable(!locked)
  }, [locked])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}
