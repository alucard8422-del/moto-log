// MapPage.tsx — 기록 메뉴 메인 (상태 관리 + 레이아웃)
// UI 수정 → map/ 폴더 각 파일 / 로직 수정 → 이 파일
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGeolocation }            from './map/useGeolocation'
import MapDisplay                    from './map/MapDisplay'
import RideHUD                       from './map/RideHUD'
import ErgonomicController           from './map/ErgonomicController'
import NavigationCountdownPopup      from '../components/NavigationCountdownPopup'
import { loadNaviPref, launchNavi }  from './map/naviUtils'
import { buildGpxXml, saveCourse }   from '../lib/courseStorage'
import {
  NAVI_OPTIONS,
  type Location,
  type RideStatus,
} from './map/types'

// ── 하버사인 거리 계산 (km) ────────────────────────────────────────────
function haversine(a: Location, b: Location): number {
  const R   = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lng - a.lng) * Math.PI) / 180
  const h   =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
    Math.cos((b.lat * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export default function MapPage() {
  const navigate        = useNavigate()
  const { position }   = useGeolocation()

  const [status,       setStatus]       = useState<RideStatus>('idle')
  const [path,         setPath]         = useState<Location[]>([])
  const [duration,     setDuration]     = useState(0)
  const [distance,     setDistance]     = useState(0)
  const [showCountdown, setShowCountdown] = useState(false)

  const rideWatchRef  = useRef<number | null>(null)
  const startTimeRef  = useRef<Date | null>(null)
  const prevPosRef    = useRef<Location | null>(null)
  const distanceRef   = useRef(0)
  const durationRef   = useRef(0)
  const mapRef        = useRef<any>(null)

  // ── 웹뷰 바운스/오버스크롤 방지 ─────────────────────────────────────
  useEffect(() => {
    const prev = {
      overflow:            document.documentElement.style.overflow,
      overscrollBehavior:  document.documentElement.style.overscrollBehavior,
    }
    document.documentElement.style.overflow           = 'hidden'
    document.documentElement.style.overscrollBehavior = 'none'
    document.body.style.overflow                      = 'hidden'
    document.body.style.overscrollBehavior            = 'none'
    return () => {
      document.documentElement.style.overflow           = prev.overflow
      document.documentElement.style.overscrollBehavior = prev.overscrollBehavior
      document.body.style.overflow                      = ''
      document.body.style.overscrollBehavior            = ''
    }
  }, [])

  // ── 주행 타이머 (riding 상태일 때만 1초 interval) ────────────────────
  useEffect(() => {
    if (status !== 'riding') return
    const id = setInterval(() => {
      durationRef.current += 1
      setDuration(durationRef.current)
    }, 1000)
    return () => clearInterval(id)
  }, [status])

  // ── 출발 버튼 → 카운트다운 팝업 ─────────────────────────────────────
  const handleStart = () => setShowCountdown(true)

  // ── 카운트다운 완료 → 내비 앱 실행 + GPS 기록 시작 ──────────────────
  const handleCountdownLaunch = () => {
    setShowCountdown(false)
    launchNavi(loadNaviPref())

    startTimeRef.current  = new Date()
    prevPosRef.current    = null
    distanceRef.current   = 0
    durationRef.current   = 0
    setPath([])
    setDistance(0)
    setDuration(0)
    setStatus('riding')

    rideWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc: Location = {
          lat:       pos.coords.latitude,
          lng:       pos.coords.longitude,
          timestamp: pos.timestamp,
          altitude:  pos.coords.altitude   ?? undefined,
          speed:     pos.coords.speed      ?? undefined,  // m/s
          heading:   pos.coords.heading    ?? undefined,  // 0~360°
        }
        const prev = prevPosRef.current
        if (prev) {
          const delta = haversine(prev, loc)
          if (delta > 0.005) {
            distanceRef.current += delta
            setDistance(distanceRef.current)
            setPath((p) => [...p, loc])
          }
        } else {
          setPath([loc])
        }
        prevPosRef.current = loc
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    )
  }

  // ── 카운트다운 취소 ──────────────────────────────────────────────────
  const handleCountdownCancel = () => setShowCountdown(false)

  // ── 정지 버튼 → GPS 중단 + GPX 저장 ─────────────────────────────────
  const handleStop = () => {
    const frozenDuration = durationRef.current
    const frozenDistance = distanceRef.current

    if (rideWatchRef.current !== null) {
      navigator.geolocation.clearWatch(rideWatchRef.current)
      rideWatchRef.current = null
    }

    const endTime  = new Date()
    const gpxPoints = path.map((p) => ({ lat: p.lat, lng: p.lng, timestamp: p.timestamp, altitude: p.altitude, speed: p.speed, heading: p.heading }))
    saveCourse({
      id:          crypto.randomUUID(),
      title:       `${endTime.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 주행`,
      distanceKm:  parseFloat(frozenDistance.toFixed(2)),
      durationMin: Math.round(frozenDuration / 60),
      gpxPoints,
      gpxXml:      buildGpxXml(gpxPoints),
      createdAt:   endTime.toISOString(),
      isShared:    false,
    })

    setDuration(frozenDuration)
    setDistance(frozenDistance)
    setStatus('finished')
  }

  // ── 언마운트 안전망 (GPS 누수 방지) ─────────────────────────────────
  useEffect(() => {
    return () => {
      if (rideWatchRef.current !== null)
        navigator.geolocation.clearWatch(rideWatchRef.current)
    }
  }, [])

  const handleGoToCourses = () => navigate('/my-routes')

  return (
    <div
      className="relative w-screen overflow-hidden bg-[#0B0F19] touch-none"
      style={{ height: '100dvh', overscrollBehavior: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* [0층] 지도 */}
      <div className="fixed inset-0 w-full h-full z-0">
        <MapDisplay
          path={path}
          currentPosition={position}
          isRiding={status === 'riding'}
          mapRef={mapRef}
        />
      </div>

      {/* [1층] 주행 중 HUD */}
      {status === 'riding' && (
        <RideHUD duration={duration} distance={distance} />
      )}

      {/* [2층] 하단 컨트롤러 */}
      <ErgonomicController
        status={status}
        duration={duration}
        distance={distance}
        onStart={handleStart}
        onStop={handleStop}
        onGoToCourses={handleGoToCourses}
      />

      {/* 카운트다운 팝업 */}
      <NavigationCountdownPopup
        isOpen={showCountdown}
        naviLabel={NAVI_OPTIONS.find((o) => o.type === loadNaviPref())?.label ?? 'T map'}
        onLaunch={handleCountdownLaunch}
        onCancel={handleCountdownCancel}
      />
    </div>
  )
}
