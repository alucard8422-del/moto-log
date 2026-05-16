// MapPage.tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGeolocation } from './map/useGeolocation'
import MapDisplay from './map/MapDisplay'
import ErgonomicController from './map/ErgonomicController'
import {
  NAVI_STORAGE_KEY,
  type GpsStatus,
  type Location,
  type NavigationType,
  type RideSession,
  type RideStatus,
} from './map/types'

function haversine(a: Location, b: Location): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lng - a.lng) * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function loadNaviPref(): NavigationType {
  return (localStorage.getItem(NAVI_STORAGE_KEY) as NavigationType) ?? 'tmap'
}

const NAVI_SCHEMES: Record<NavigationType, string> = {
  tmap:  'tmap://search?name=%ED%98%84%EC%9E%AC%EC%9C%84%EC%B9%98',
  kakao: 'kakaonavi://search?name=%ED%98%84%EC%9E%AC%EC%9C%84%EC%B9%98',
  atlan: 'atlan://search?name=%ED%98%84%EC%9E%AC%EC%9C%84%EC%B9%98',
}

const NAVI_STORE_FALLBACK: Record<NavigationType, string> = {
  tmap:  'https://apps.apple.com/kr/app/tmap/id431589174',
  kakao: 'https://apps.apple.com/kr/app/id668182711',
  atlan: 'https://apps.apple.com/kr/app/id681663516',
}

function launchNavi(type: NavigationType) {
  window.location.href = NAVI_SCHEMES[type]
  // 앱 미설치 시 스토어로 이동 (1.5s 이후 앱이 열렸으면 무시됨)
  setTimeout(() => {
    window.open(NAVI_STORE_FALLBACK[type], '_blank')
  }, 1500)
}

export default function MapPage() {
  const navigate = useNavigate()
  const { position, errorCode, loading } = useGeolocation()

  const [naviType, setNaviType] = useState<NavigationType>(loadNaviPref)
  const [status, setStatus] = useState<RideStatus>('idle')
  const [path, setPath] = useState<Location[]>([])
  const [duration, setDuration] = useState(0)
  const [distance, setDistance] = useState(0)
  const [session, setSession] = useState<RideSession | null>(null)

  const rideWatchRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const prevPosRef = useRef<Location | null>(null)
  const distanceRef = useRef(0)

  const gpsStatus: GpsStatus =
    !loading && position !== null && errorCode === null ? 'connected' : 'disconnected'

  // 웹뷰 바운스/오버스크롤 방지
  useEffect(() => {
    const prev = {
      overflow: document.documentElement.style.overflow,
      overscrollBehavior: document.documentElement.style.overscrollBehavior,
    }
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.overscrollBehavior = 'none'
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    return () => {
      document.documentElement.style.overflow = prev.overflow
      document.documentElement.style.overscrollBehavior = prev.overscrollBehavior
      document.body.style.overflow = ''
      document.body.style.overscrollBehavior = ''
    }
  }, [])

  const handleStart = () => {
    launchNavi(naviType)

    startTimeRef.current = new Date()
    prevPosRef.current = null
    distanceRef.current = 0
    setPath([])
    setDistance(0)
    setDuration(0)
    setStatus('riding')

    rideWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc: Location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
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

    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
  }

  const handleStop = () => {
    if (rideWatchRef.current !== null) {
      navigator.geolocation.clearWatch(rideWatchRef.current)
      rideWatchRef.current = null
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    const endTime = new Date()
    setSession({
      id: crypto.randomUUID(),
      startTime: startTimeRef.current ?? endTime,
      endTime,
      distance: distanceRef.current,
      duration,
      path,
    })
    setStatus('finished')
  }

  const handleGoToCourses = () => {
    navigate('/courses', { state: { completedSession: session } })
  }

  useEffect(() => {
    return () => {
      if (rideWatchRef.current !== null) navigator.geolocation.clearWatch(rideWatchRef.current)
      if (timerRef.current !== null) clearInterval(timerRef.current)
    }
  }, [])

  return (
    /*
     * [루트] relative + NO z-index → 스태킹 컨텍스트 미생성 → 자식 z-index가 루트 기준으로 비교됨
     * 레이어 순서: 지도(z-0) < 타이틀(z-10) < 컨트롤러(z-20) < Layout nav(z-30) < NaviSheet(z-40/50)
     */
    <div
      className="relative w-screen h-screen overflow-hidden bg-[#0B0F19] touch-none"
      style={{ overscrollBehavior: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* [0층] 지도 엔진 — fixed + z-0 으로 완전히 바닥에 격리 */}
      <div className="fixed inset-0 w-full h-full z-0">
        <MapDisplay
          path={path}
          currentPosition={position}
          isRiding={status === 'riding'}
          gpsStatus={gpsStatus}
        />
      </div>

      {/* [1층] 상단 타이틀 — z-10, 빈 영역은 지도 터치 통과 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-4">
        <div className="pointer-events-auto rounded-full bg-[#161B26]/70 px-4 py-1.5 backdrop-blur-md">
          <span className="text-[11px] font-bold tracking-[0.2em] text-white/50">MOTO LOG</span>
        </div>
      </div>

      {/*
       * [2층] 제어 바 — 루트 직계 자식으로 배치 (핵심)
       * · ErgonomicController 내부 absolute(z-20): 루트 기준 z-20 → nav(z-30) 아래, 지도(z-0) 위 ✓
       * · NaviSheet 내부 fixed(z-40/50): 루트 기준 z-40/50 → nav(z-30) 위 ✓
       *   → z-10 div 안에 넣으면 NaviSheet가 z-10 컨텍스트에 갇혀 nav 뒤로 숨는 버그 발생하므로 반드시 분리
       */}
      <ErgonomicController
        status={status}
        naviType={naviType}
        duration={duration}
        distance={distance}
        onStart={handleStart}
        onStop={handleStop}
        onGoToCourses={handleGoToCourses}
        onNaviChange={setNaviType}
      />
    </div>
  )
}
