// RideRecordContext.tsx — GPS 기록 전역 상태
// BrowserRouter 외부에서 제공 → 탭 이동해도 기록 유지

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { buildGpxXml, saveCourse } from '../lib/courseStorage'
import { insertMyCourse }          from '../lib/courseService'
import type { Location, RideStatus } from '../features/record/types'

// ── 하버사인 거리 계산 (km) ────────────────────────────────────────────────
function haversine(a: Location, b: Location): number {
  const R    = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lng - a.lng) * Math.PI) / 180
  const h    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
    Math.cos((b.lat * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const CHECKPOINT_KEY = 'moto:ride_checkpoint'

// ── 컨텍스트 타입 ──────────────────────────────────────────────────────────
interface RideRecordCtx {
  status:          RideStatus
  path:            Location[]
  duration:        number
  distance:        number
  wakeLockActive:  boolean
  startRecording:  () => void
  stopRecording:   () => void
  resetStatus:     () => void
}

const Ctx = createContext<RideRecordCtx | null>(null)

export function useRideRecord(): RideRecordCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useRideRecord must be used inside RideRecordProvider')
  return c
}

// ── 프로바이더 ─────────────────────────────────────────────────────────────
export function RideRecordProvider({ children }: { children: React.ReactNode }) {
  const [status,         setStatus]        = useState<RideStatus>('idle')
  const [path,           setPath]          = useState<Location[]>([])
  const [duration,       setDuration]      = useState(0)
  const [distance,       setDistance]      = useState(0)
  const [wakeLockActive, setWakeLockActive] = useState(false)

  const rideWatchRef = useRef<number | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const prevPosRef   = useRef<Location | null>(null)
  const distanceRef  = useRef(0)
  const durationRef  = useRef(0)
  const wakeLockRef  = useRef<WakeLockSentinel | null>(null)
  const pathRef      = useRef<Location[]>([])

  // ── Wake Lock 요청 ─────────────────────────────────────────────────────
  const acquireWakeLock = async () => {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
      setWakeLockActive(true)
      ;(wakeLockRef.current as any).addEventListener('release', () => {
        wakeLockRef.current = null
        setWakeLockActive(false)
      })
    } catch {
      setWakeLockActive(false)
    }
  }

  // ── Wake Lock 해제 ─────────────────────────────────────────────────────
  const releaseWakeLock = () => {
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
    setWakeLockActive(false)
  }

  // ── 화면 복귀 시 Wake Lock 재취득 ─────────────────────────────────────
  useEffect(() => {
    const onVisibility = async () => {
      if (document.visibilityState === 'visible' && rideWatchRef.current !== null) {
        if (!wakeLockRef.current) await acquireWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // ── 주행 타이머 ────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'riding') return
    const id = setInterval(() => {
      durationRef.current += 1
      setDuration(durationRef.current)
    }, 1000)
    return () => clearInterval(id)
  }, [status])

  // ── 체크포인트 자동 저장 (30초, 강제종료 대비) ─────────────────────────
  useEffect(() => {
    if (status !== 'riding') return
    const id = setInterval(() => {
      if (pathRef.current.length < 2) return
      try {
        localStorage.setItem(CHECKPOINT_KEY, JSON.stringify({
          path:      pathRef.current,
          distance:  distanceRef.current,
          duration:  durationRef.current,
          startedAt: startTimeRef.current?.toISOString(),
        }))
      } catch {}
    }, 30_000)
    return () => clearInterval(id)
  }, [status])

  // ── GPS 기록 시작 ──────────────────────────────────────────────────────
  const startRecording = () => {
    startTimeRef.current = new Date()
    prevPosRef.current   = null
    distanceRef.current  = 0
    durationRef.current  = 0
    pathRef.current      = []
    setPath([])
    setDistance(0)
    setDuration(0)
    setStatus('riding')

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
              pathRef.current = next
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

  // ── GPS 기록 종료 + 저장 ───────────────────────────────────────────────
  const stopRecording = () => {
    const frozenDuration = durationRef.current
    const frozenDistance = distanceRef.current
    const frozenPath     = pathRef.current

    if (rideWatchRef.current !== null) {
      navigator.geolocation.clearWatch(rideWatchRef.current)
      rideWatchRef.current = null
    }

    releaseWakeLock()
    localStorage.removeItem(CHECKPOINT_KEY)

    const endTime   = new Date()
    const gpxPoints = frozenPath.map(p => ({
      lat: p.lat, lng: p.lng, timestamp: p.timestamp,
      altitude: p.altitude, speed: p.speed, heading: p.heading,
    }))
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
    insertMyCourse(rideRecord).catch(e => console.warn('[RideRecord] 서버 저장 실패:', e))

    setDuration(frozenDuration)
    setDistance(frozenDistance)
    setStatus('finished')
  }

  // ── 상태 초기화 (finished → idle) ─────────────────────────────────────
  const resetStatus = () => {
    setStatus('idle')
    setPath([])
    setDuration(0)
    setDistance(0)
  }

  // ── 언마운트 안전망 ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (rideWatchRef.current !== null)
        navigator.geolocation.clearWatch(rideWatchRef.current)
    }
  }, [])

  return (
    <Ctx.Provider value={{
      status, path, duration, distance, wakeLockActive,
      startRecording, stopRecording, resetStatus,
    }}>
      {children}
    </Ctx.Provider>
  )
}
