// index.tsx (MapPage)
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGeolocation } from './map/useGeolocation'
import MapDisplay from './map/MapDisplay'
import ErgonomicController from './map/ErgonomicController'
import {
  NAVI_OPTIONS,
  NAVI_STORAGE_KEY,
  type Coordinates,
  type NavigationType,
  type RideSession,
  type RideStatus,
} from './map/types'

function haversine(a: Coordinates, b: Coordinates): number {
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

function launchNavi(type: NavigationType) {
  const opt = NAVI_OPTIONS.find((o) => o.type === type)
  if (!opt) return
  window.location.href = opt.scheme
  setTimeout(() => window.open(opt.fallback, '_blank'), 1500)
}

export default function MapPage() {
  const navigate = useNavigate()
  const { position, errorCode, loading } = useGeolocation()

  const [naviType, setNaviType] = useState<NavigationType>(loadNaviPref)
  const [status, setStatus] = useState<RideStatus>('idle')
  const [path, setPath] = useState<Coordinates[]>([])
  const [duration, setDuration] = useState(0)
  const [distance, setDistance] = useState(0)
  const [session, setSession] = useState<RideSession | null>(null)

  const rideWatchRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const prevPosRef = useRef<Coordinates | null>(null)
  const distanceRef = useRef(0)

  // 바운스/스크롤 방지 (APK 환경)
  useEffect(() => {
    const prev = {
      overflow: document.body.style.overflow,
      overscroll: document.body.style.overscrollBehavior,
      touchAction: document.body.style.touchAction,
      position: document.body.style.position,
    }
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    document.body.style.touchAction = 'none'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    return () => {
      Object.assign(document.body.style, prev)
      document.body.style.width = ''
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
        const coord: Coordinates = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
        }
        const prev = prevPosRef.current
        if (prev) {
          const delta = haversine(prev, coord)
          if (delta > 0.005) {
            distanceRef.current += delta
            setDistance(distanceRef.current)
            setPath((p) => [...p, coord])
          }
        } else {
          setPath([coord])
        }
        prevPosRef.current = coord
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    )

    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1)
    }, 1000)
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
    <div
      className="relative w-full overflow-hidden bg-[#0b0f19]"
      style={{
        height: 'calc(100svh - 64px)',
        touchAction: 'none',
        overscrollBehavior: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <MapDisplay
        path={path}
        currentPosition={position}
        isRiding={status === 'riding'}
        geoError={errorCode}
        geoLoading={loading}
      />

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
