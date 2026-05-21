// MapPage.tsx — 기록 메뉴 메인 (상태 관리 + 레이아웃)
// UI 수정 → features/record/ 각 파일 / 로직 수정 → 이 파일
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGeolocation }            from './useGeolocation'
import MapDisplay                    from './MapDisplay'
import RideHUD                       from './RideHUD'
import ErgonomicController           from './ErgonomicController'
import NavigationCountdownPopup      from '../../components/NavigationCountdownPopup'
import { loadNaviPref, launchNavi }  from '../../lib/naviUtils'
import { buildGpxXml, saveCourse }   from '../../lib/courseStorage'
import { insertMyCourse }            from '../../lib/courseService'
import {
  NAVI_OPTIONS, NAVI_STORAGE_KEY,
  type Location, type RideStatus, type NavigationType,
} from './types'
import NaviSettings from './NaviSettings'

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

  const [status,         setStatus]        = useState<RideStatus>('idle')
  const [path,           setPath]          = useState<Location[]>([])
  const [duration,       setDuration]      = useState(0)
  const [distance,       setDistance]      = useState(0)
  const [showCountdown,  setShowCountdown] = useState(false)
  const [showNaviSheet,  setShowNaviSheet] = useState(false)
  const [naviPref,       setNaviPref]      = useState<NavigationType>(loadNaviPref)
  const [wakeLockActive, setWakeLockActive] = useState(false)

  const rideWatchRef  = useRef<number | null>(null)
  const startTimeRef  = useRef<Date | null>(null)
  const prevPosRef    = useRef<Location | null>(null)
  const distanceRef   = useRef(0)
  const durationRef   = useRef(0)
  const mapRef        = useRef<any>(null)
  const wakeLockRef   = useRef<WakeLockSentinel | null>(null)
  const pathRef       = useRef<Location[]>([])   // 체크포인트 저장용 최신 path 미러

  // ── Wake Lock 요청 ───────────────────────────────────────────────────
  const acquireWakeLock = async () => {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
      setWakeLockActive(true)
      wakeLockRef.current.addEventListener('release', () => {
        wakeLockRef.current = null
        setWakeLockActive(false)
      })
    } catch {
      setWakeLockActive(false)
    }
  }

  // ── Wake Lock 해제 ───────────────────────────────────────────────────
  const releaseWakeLock = () => {
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
    setWakeLockActive(false)
  }

  // ── 화면 복귀 시 Wake Lock 재취득 + GPS 살아있는지 확인 ─────────────
  useEffect(() => {
    const onVisibility = async () => {
      if (document.visibilityState === 'visible' && rideWatchRef.current !== null) {
        // Wake Lock이 해제됐으면 재취득
        if (!wakeLockRef.current) await acquireWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // ── 주행 중 체크포인트 자동 저장 (30초마다, 앱 강제종료 대비) ─────────
  const CHECKPOINT_KEY = 'moto:ride_checkpoint'
  useEffect(() => {
    if (status !== 'riding') return
    const id = setInterval(() => {
      if (pathRef.current.length < 2) return
      try {
        localStorage.setItem(CHECKPOINT_KEY, JSON.stringify({
          path:     pathRef.current,
          distance: distanceRef.current,
          duration: durationRef.current,
          startedAt: startTimeRef.current?.toISOString(),
        }))
      } catch {}
    }, 30_000)
    return () => clearInterval(id)
  }, [status])

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

  // ── GPS 기록 시작 (공통) ─────────────────────────────────────────────
  const startGpsRecording = () => {
    startTimeRef.current = new Date()
    prevPosRef.current   = null
    distanceRef.current  = 0
    durationRef.current  = 0
    pathRef.current      = []
    setPath([])
    setDistance(0)
    setDuration(0)
    setStatus('riding')

    // 화면 꺼짐 방지 — 배터리 소모 있지만 GPS 기록 유지에 필수
    acquireWakeLock()

    rideWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc: Location = {
          lat:       pos.coords.latitude,
          lng:       pos.coords.longitude,
          timestamp: pos.timestamp,
          altitude:  pos.coords.altitude ?? undefined,
          speed:     pos.coords.speed    ?? undefined,
          heading:   pos.coords.heading  ?? undefined,
        }
        const prev = prevPosRef.current
        if (prev) {
          const delta = haversine(prev, loc)
          if (delta > 0.005) {
            distanceRef.current += delta
            setDistance(distanceRef.current)
            setPath(p => {
              const next = [...p, loc]
              pathRef.current = next   // ref 미러 업데이트 (체크포인트용)
              return next
            })
          }
        } else {
          setPath([loc])
          pathRef.current = [loc]
        }
        prevPosRef.current = loc
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    )
  }

  // ── 네비로 시작 → 카운트다운 팝업 ───────────────────────────────────
  const handleStart = () => setShowCountdown(true)

  // ── 카운트다운 완료 → 내비 앱 실행 + GPS 기록 ───────────────────────
  const handleCountdownLaunch = () => {
    setShowCountdown(false)
    launchNavi(naviPref)
    startGpsRecording()
  }

  // ── 그냥 시작 → 내비 없이 GPS 기록만 ───────────────────────────────
  const handleStartDirect = () => startGpsRecording()

  // ── 네비 선택 시트 ──────────────────────────────────────────────────
  const handleNaviSelect  = () => setShowNaviSheet(true)
  const handleNaviSave    = () => {
    localStorage.setItem(NAVI_STORAGE_KEY, naviPref)
    setShowNaviSheet(false)
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

    // Wake Lock 해제 + 체크포인트 삭제 (정상 저장됐으므로)
    releaseWakeLock()
    localStorage.removeItem(CHECKPOINT_KEY)

    const endTime  = new Date()
    const gpxPoints = path.map((p) => ({ lat: p.lat, lng: p.lng, timestamp: p.timestamp, altitude: p.altitude, speed: p.speed, heading: p.heading }))
    const rideRecord = {
      id:          crypto.randomUUID(),
      title:       `${endTime.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 주행`,
      distanceKm:  parseFloat(frozenDistance.toFixed(2)),
      durationMin: Math.round(frozenDuration / 60),
      gpxPoints,
      gpxXml:      buildGpxXml(gpxPoints),
      createdAt:   endTime.toISOString(),
      isShared:    false,
    }
    saveCourse(rideRecord)
    insertMyCourse(rideRecord).catch(e => console.warn('[MapPage] 서버 저장 실패:', e))

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
        <RideHUD duration={duration} distance={distance} wakeLockActive={wakeLockActive} />
      )}

      {/* [2층] 하단 컨트롤러 */}
      <ErgonomicController
        status={status}
        duration={duration}
        distance={distance}
        onStart={handleStart}
        onStartDirect={handleStartDirect}
        onNaviSelect={handleNaviSelect}
        onStop={handleStop}
        onGoToCourses={handleGoToCourses}
      />

      {/* 네비 선택 시트 */}
      {showNaviSheet && (
        <NaviSettings
          selected={naviPref}
          onSelect={setNaviPref}
          onSave={handleNaviSave}
          onClose={() => setShowNaviSheet(false)}
          isFirstLaunch={false}
        />
      )}

      {/* 카운트다운 팝업 */}
      <NavigationCountdownPopup
        isOpen={showCountdown}
        naviLabel={NAVI_OPTIONS.find((o) => o.type === naviPref)?.label ?? 'T map'}
        onLaunch={handleCountdownLaunch}
        onCancel={handleCountdownCancel}
      />
    </div>
  )
}
