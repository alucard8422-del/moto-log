// KoreaRouteMap.tsx — 내 경로 > 전국 누적 동선 지도 (카카오맵)
// 지도 UI 수정 시 이 파일만 건드리면 됩니다.

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { KAKAO_APP_KEY } from './routeUtils'
import type { SavedCourse } from '../../lib/courseStorage'
import RoadviewModal from '../../components/RoadviewModal'

declare global {
  interface Window { kakao: any }
}

interface Props {
  courses: SavedCourse[]
}

export default function KoreaRouteMap({ courses }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<any>(null)
  const polylinesRef  = useRef<any[]>([])
  const [mapReady,    setMapReady]    = useState(false)
  const [roadviewPos, setRoadviewPos] = useState<{ lat: number; lng: number } | null>(null)

  // ── 지도 초기화 (최초 1회) ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    const doInit = () => {
      if (cancelled || !containerRef.current) return
      window.kakao.maps.load(() => {
        // mapRef.current 체크로 StrictMode 이중 초기화 방지
        if (cancelled || !containerRef.current || mapRef.current) return
        const map = new window.kakao.maps.Map(containerRef.current, {
          center: new window.kakao.maps.LatLng(36.2, 127.9),
          level: 13,
        })
        // 드래그·줌 허용 → 경로 탐색 가능
        map.setZoomable(true)
        map.setDraggable(true)
        mapRef.current = map
        setMapReady(true)

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

        containerRef.current!.addEventListener('mousedown', e => startLP(e.clientX, e.clientY))
        containerRef.current!.addEventListener('mousemove', e => moveLP(e.clientX, e.clientY))
        containerRef.current!.addEventListener('mouseup',   cancelLP)
        containerRef.current!.addEventListener('touchstart', e => {
          const t = e.touches[0]; startLP(t.clientX, t.clientY)
        }, { passive: true })
        containerRef.current!.addEventListener('touchmove', e => {
          const t = e.touches[0]; moveLP(t.clientX, t.clientY)
        }, { passive: true })
        containerRef.current!.addEventListener('touchend',   cancelLP)
        containerRef.current!.addEventListener('touchcancel', cancelLP)
      })
    }

    const scriptId = 'kakao-map-script'
    const script = document.getElementById(scriptId) as HTMLScriptElement | null

    if (window.kakao)       doInit()
    else if (script)        script.addEventListener('load', doInit)
    else {
      const s = document.createElement('script')
      s.id  = scriptId
      s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`
      s.addEventListener('load', doInit)
      document.head.appendChild(s)
    }

    // cancelled만 세팅 — mapRef는 유지해서 이중 초기화 방지
    return () => { cancelled = true }
  }, [])

  // ── 경로 폴리라인 갱신 ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.kakao?.maps) return

    polylinesRef.current.forEach(p => p.setMap(null))
    polylinesRef.current = []

    courses
      .filter(c => c.gpxPoints.length >= 2)
      .forEach(course => {
        const path = course.gpxPoints.map(p =>
          new window.kakao.maps.LatLng(p.lat, p.lng)
        )
        const glow = new window.kakao.maps.Polyline({
          path, strokeWeight: 10, strokeColor: '#2DD4BF',
          strokeOpacity: 0.12, strokeStyle: 'solid',
        })
        const main = new window.kakao.maps.Polyline({
          path, strokeWeight: 2.5, strokeColor: '#2DD4BF',
          strokeOpacity: 0.85, strokeStyle: 'solid',
        })
        glow.setMap(mapRef.current)
        main.setMap(mapRef.current)
        polylinesRef.current.push(glow, main)
      })
  }, [courses, mapReady])

  const lineCount = courses.filter(c => c.gpxPoints.length >= 2).length

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/5" style={{ height: 300 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

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

      {/* 하단 그라데이션 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-slate-950 to-transparent" />
      {/* 누적 동선 뱃지 */}
      <div className="pointer-events-none absolute left-4 top-4 z-30 flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
        <span className="text-[10px] font-light text-white/60">누적 동선</span>
      </div>
      {lineCount > 0 && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-30 rounded-full border border-teal-400/20 bg-slate-950/70 px-3 py-1.5 backdrop-blur-md">
          <span className="text-[10px] font-bold text-teal-400">{lineCount}개 경로</span>
        </div>
      )}
    </div>
  )
}
