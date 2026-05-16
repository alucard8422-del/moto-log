// index.tsx (MapPage)
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MapDisplay from './map/MapDisplay'
import RideController from './map/RideController'
import NaviSettings from './map/NaviSettings'
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

function loadNaviPref(): NavigationType | null {
  return (localStorage.getItem(NAVI_STORAGE_KEY) as NavigationType) ?? null
}

function saveNaviPref(type: NavigationType) {
  localStorage.setItem(NAVI_STORAGE_KEY, type)
}

function launchNavi(type: NavigationType) {
  const opt = NAVI_OPTIONS.find((o) => o.type === type)
  if (!opt) return
  window.location.href = opt.scheme
  setTimeout(() => window.open(opt.fallback, '_blank'), 1500)
}

export default function MapPage() {
  const navigate = useNavigate()

  const [naviPref, setNaviPref] = useState<NavigationType | null>(loadNaviPref)
  const [naviDraft, setNaviDraft] = useState<NavigationType>(naviPref ?? 'tmap')
  const [showSettings, setShowSettings] = useState(false)
  const [status, setStatus] = useState<RideStatus>('idle')
  const [path, setPath] = useState<Coordinates[]>([])
  const [currentPosition, setCurrentPosition] = useState<Coordinates | null>(null)
  const [duration, setDuration] = useState(0)
  const [distance, setDistance] = useState(0)
  const [session, setSession] = useState<RideSession | null>(null)

  const watchIdRef = useRef<number | null>(null)
  const rideWatchIdRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const pathRef = useRef<Coordinates[]>([])
  const distanceRef = useRef(0)

  // 앱 시작 시 위치 미리 수신
  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
        })
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 8000, timeout: 20000 }
    )
    watchIdRef.current = id
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  // 최초 실행 시 내비 설정 안내
  useEffect(() => {
    if (!naviPref) setShowSettings(true)
  }, [naviPref])

  const handleSaveSettings = () => {
    saveNaviPref(naviDraft)
    setNaviPref(naviDraft)
    setShowSettings(false)
  }

  const handleStart = () => {
    if (!naviPref) {
      setShowSettings(true)
      return
    }

    // 1. 외부 내비 즉시 실행
    launchNavi(naviPref)

    // 2. 앱 내 GPX 기록 시작
    startTimeRef.current = new Date()
    pathRef.current = []
    distanceRef.current = 0
    setPath([])
    setDistance(0)
    setDuration(0)
    setStatus('riding')

    rideWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coord: Coordinates = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
        }
        setCurrentPosition(coord)
        const prev = pathRef.current[pathRef.current.length - 1]
        if (prev) {
          const delta = haversine(prev, coord)
          if (delta > 0.005) {
            distanceRef.current += delta
            setDistance(distanceRef.current)
            pathRef.current = [...pathRef.current, coord]
            setPath([...pathRef.current])
          }
        } else {
          pathRef.current = [coord]
          setPath([coord])
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    )

    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1)
    }, 1000)
  }

  const handleStop = () => {
    if (rideWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(rideWatchIdRef.current)
      rideWatchIdRef.current = null
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
      path: pathRef.current,
    })
    setStatus('finished')
  }

  const handleGoToCourses = () => {
    navigate('/courses', { state: { completedSession: session } })
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      if (rideWatchIdRef.current !== null) navigator.geolocation.clearWatch(rideWatchIdRef.current)
      if (timerRef.current !== null) clearInterval(timerRef.current)
    }
  }, [])

  return (
    <div className="relative h-[calc(100svh-64px)] w-full overflow-hidden">
      <MapDisplay
        path={path}
        currentPosition={currentPosition}
        isRiding={status === 'riding'}
      />

      <RideController
        status={status}
        naviType={naviPref}
        duration={duration}
        distance={distance}
        onStart={handleStart}
        onStop={handleStop}
        onGoToCourses={handleGoToCourses}
        onOpenSettings={() => {
          setNaviDraft(naviPref ?? 'tmap')
          setShowSettings(true)
        }}
      />

      {showSettings && (
        <NaviSettings
          selected={naviDraft}
          onSelect={setNaviDraft}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
          isFirstLaunch={!naviPref}
        />
      )}
    </div>
  )
}
