// KoreaRouteMap.tsx — 내 경로 > 전국 누적 동선 지도 (카카오맵)
// 지도 UI 수정 시 이 파일만 건드리면 됩니다.

import { useEffect, useRef, useState } from 'react'
import { KAKAO_APP_KEY } from './routeUtils'
import type { SavedCourse } from '../../../lib/courseStorage'

declare global {
  interface Window { kakao: any }
}

interface Props {
  courses:   SavedCourse[]
  isLoading?: boolean
}

export default function KoreaRouteMap({ courses, isLoading = false }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<any>(null)
  const polylinesRef  = useRef<any[]>([])
  const [mapReady,    setMapReady]    = useState(false)

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
        // 내 경로 지도는 확인용 — 드래그·줌 비활성화 (페이지 스크롤 방해 방지)
        map.setZoomable(false)
        map.setDraggable(false)
        mapRef.current = map
        setMapReady(true)

        // 컨테이너 크기 재계산 — SDK가 초기화 시 높이를 잘못 읽는 버그 방지
        requestAnimationFrame(() => { try { map.relayout() } catch {} })
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

  // ── 경로 폴리라인 갱신 + 뷰 자동 조정 ────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.kakao?.maps) return

    let cancelled = false

    // 기존 폴리라인 제거
    polylinesRef.current.forEach(p => p.setMap(null))
    polylinesRef.current = []

    const validCourses = courses.filter(c => c.gpxPoints.length >= 2)

    if (validCourses.length === 0) {
      // 아직 서버 응답 전이면 대기 — geolocation을 섣불리 호출하지 않음
      if (isLoading) return () => { cancelled = true }

      // ── 경로 없음(로딩 완료): 현재 위치로 중앙 이동 ───────────────
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (cancelled || !mapRef.current) return
          mapRef.current.setCenter(
            new window.kakao.maps.LatLng(coords.latitude, coords.longitude)
          )
          mapRef.current.setLevel(5)
        },
        () => {
          if (cancelled || !mapRef.current) return
          mapRef.current.setCenter(new window.kakao.maps.LatLng(36.2, 127.9))
          mapRef.current.setLevel(13)
        },
        { timeout: 5000 }
      )
      return () => { cancelled = true }
    }

    // ── 경로 있음: 폴리라인 그리고 전체 경로가 보이도록 bounds 맞춤 ──
    const bounds = new window.kakao.maps.LatLngBounds()

    validCourses.forEach(course => {
      const path = course.gpxPoints.map(p =>
        new window.kakao.maps.LatLng(p.lat, p.lng)
      )
      path.forEach(ll => bounds.extend(ll))

      const glow = new window.kakao.maps.Polyline({
        path, strokeWeight: 10, strokeColor: '#FF5A00',
        strokeOpacity: 0.18, strokeStyle: 'solid',
      })
      const main = new window.kakao.maps.Polyline({
        path, strokeWeight: 2.5, strokeColor: '#FF5A00',
        strokeOpacity: 0.9, strokeStyle: 'solid',
      })
      glow.setMap(mapRef.current)
      main.setMap(mapRef.current)
      polylinesRef.current.push(glow, main)
    })

    requestAnimationFrame(() => {
      if (cancelled) return
      try {
        mapRef.current.relayout()
        mapRef.current.setBounds(bounds)
      } catch {}
    })

    return () => { cancelled = true }
  }, [courses, mapReady, isLoading])

  const lineCount = courses.filter(c => c.gpxPoints.length >= 2).length

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/5" style={{ height: 300 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* 하단 그라데이션 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-slate-950 to-transparent" />
      {/* 누적 동선 뱃지 */}
      <div className="pointer-events-none absolute left-4 top-4 z-30 flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A00]" />
        <span className="text-[10px] font-light text-white/60">누적 동선</span>
      </div>
      {lineCount > 0 && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-30 rounded-full border border-[#FF5A00]/20 bg-slate-950/70 px-3 py-1.5 backdrop-blur-md">
          <span className="text-[10px] font-bold text-[#FF5A00]">{lineCount}개 경로</span>
        </div>
      )}
    </div>
  )
}
