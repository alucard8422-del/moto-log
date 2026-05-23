// RideRecordContext.tsx — GPS 기록 전역 상태
// BrowserRouter 외부에서 제공 → 탭 이동해도 기록 유지

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { buildGpxXml, saveCourse } from '../lib/courseStorage'
import { insertMyCourse }          from '../lib/courseService'
import { approxCity }              from '../features/my-routes/routes/routeUtils'
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

// ── 체크포인트 데이터 타입 ─────────────────────────────────────────────────
export interface CheckpointData {
  path:      Location[]
  distance:  number
  duration:  number
  startedAt: string
}

// ── 컨텍스트 타입 ──────────────────────────────────────────────────────────
interface RideRecordCtx {
  status:                RideStatus
  path:                  Location[]
  duration:              number
  distance:              number
  currentSpeed:          number                  // 현재 실시간 속도 (km/h)
  wakeLockActive:        boolean
  pendingCheckpoint:     CheckpointData | null   // 앱 재시작 후 복구 대기 중인 체크포인트
  startRecording:        () => void
  stopRecording:         () => void
  resetStatus:           () => void
  resumeFromCheckpoint:  () => void              // 체크포인트에서 이어달리기
  discardCheckpoint:     () => void              // 체크포인트 버리고 새로 시작
}

const Ctx = createContext<RideRecordCtx | null>(null)

export function useRideRecord(): RideRecordCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useRideRecord must be used inside RideRecordProvider')
  return c
}

// ── 프로바이더 ─────────────────────────────────────────────────────────────
export function RideRecordProvider({ children }: { children: React.ReactNode }) {
  const [status,            setStatus]           = useState<RideStatus>('idle')
  const [path,              setPath]             = useState<Location[]>([])
  const [duration,          setDuration]         = useState(0)
  const [distance,          setDistance]         = useState(0)
  const [currentSpeed,      setCurrentSpeed]     = useState(0)           // 실시간 속도 (km/h)
  const [wakeLockActive,    setWakeLockActive]   = useState(false)

  // 앱 재시작 시 복구 대기 중인 체크포인트 (mount 시 1회 읽기)
  const [pendingCheckpoint, setPendingCheckpoint] = useState<CheckpointData | null>(() => {
    try {
      const raw = localStorage.getItem(CHECKPOINT_KEY)
      return raw ? (JSON.parse(raw) as CheckpointData) : null
    } catch { return null }
  })

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

      // release 이벤트: 브라우저가 강제 해제할 때 즉시 재취득 시도
      // (멀티윈도우에서 visibilitychange 없이 해제되는 케이스 대응)
      ;(wakeLockRef.current as any).addEventListener('release', () => {
        wakeLockRef.current = null
        setWakeLockActive(false)
        // 주행 중이고 페이지가 visible 상태면 즉시 재취득
        if (rideWatchRef.current !== null && document.visibilityState === 'visible') {
          // 짧은 딜레이 후 재시도 (브라우저가 release 처리 완료 후 request 받을 수 있도록)
          setTimeout(() => {
            if (rideWatchRef.current !== null && !wakeLockRef.current) {
              acquireWakeLock()
            }
          }, 300)
        }
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

  // ── Wake Lock 재취득: visibilitychange + focus (멀티윈도우 대응) ────────
  // 멀티윈도우(분할화면)에서는 visibilitychange가 발생하지 않고
  // focus 이벤트만 발생하므로 두 가지 모두 감지
  useEffect(() => {
    const tryReacquire = async () => {
      if (rideWatchRef.current !== null && !wakeLockRef.current) {
        await acquireWakeLock()
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tryReacquire()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', tryReacquire)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', tryReacquire)
    }
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

  // ── 공통 GPS watchPosition 시작 (startRecording / resumeFromCheckpoint 공유) ──
  const startWatchPosition = (initialPrev: Location | null) => {
    prevPosRef.current = initialPrev

    rideWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc: Location = {
          lat:       pos.coords.latitude,
          lng:       pos.coords.longitude,
          timestamp: pos.timestamp,
          altitude:  pos.coords.altitude  ?? undefined,
          speed:     pos.coords.speed     ?? undefined,
          heading:   pos.coords.heading   ?? undefined,
        }

        // ── 실시간 속도 계산 ──────────────────────────────────────────────
        // 1순위: GPS 하드웨어가 제공하는 속도(m/s → km/h)
        // 2순위: 직전 포인트와의 거리/시간으로 순간속도 계산
        const prev = prevPosRef.current
        if (pos.coords.speed != null && pos.coords.speed >= 0) {
          setCurrentSpeed(pos.coords.speed * 3.6)
        } else if (prev && prev.timestamp) {
          const dtSec = (loc.timestamp - prev.timestamp) / 1000
          if (dtSec > 0) {
            const instSpeed = (haversine(prev, loc) / dtSec) * 3600  // km/h
            setCurrentSpeed(instSpeed)
          }
        }

        if (prev) {
          const delta = haversine(prev, loc)

          // ── 터널·GPS 점프 필터 ────────────────────────────────────────
          // 직전 포인트 대비 속도가 물리적으로 불가능(300km/h 초과)하면
          // 이 포인트를 버리고 prevPos도 업데이트하지 않음
          // → 터널 이탈 후 첫 유효 포인트가 마지막 실제 위치와 비교됨
          if (delta > 0.01 && prev.timestamp) {
            const dtSec = (loc.timestamp - prev.timestamp) / 1000
            if (dtSec > 0 && (delta / dtSec) * 3600 > 300) {
              return   // GPS 점프 감지 → 포인트 버림
            }
          }

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

  // ── GPS 기록 시작 (새 주행) ────────────────────────────────────────────
  const startRecording = () => {
    // 대기 중인 체크포인트가 있으면 버리기
    if (pendingCheckpoint) {
      localStorage.removeItem(CHECKPOINT_KEY)
      setPendingCheckpoint(null)
    }

    startTimeRef.current = new Date()
    distanceRef.current  = 0
    durationRef.current  = 0
    pathRef.current      = []
    setPath([])
    setDistance(0)
    setDuration(0)
    setCurrentSpeed(0)
    setStatus('riding')

    acquireWakeLock()
    startWatchPosition(null)
  }

  // ── 체크포인트에서 이어달리기 ─────────────────────────────────────────
  const resumeFromCheckpoint = () => {
    if (!pendingCheckpoint) return
    const cp = pendingCheckpoint

    startTimeRef.current = cp.startedAt ? new Date(cp.startedAt) : new Date()
    distanceRef.current  = cp.distance
    durationRef.current  = cp.duration
    pathRef.current      = cp.path

    setPath(cp.path)
    setDistance(cp.distance)
    setDuration(cp.duration)
    setStatus('riding')
    setPendingCheckpoint(null)
    // localStorage 체크포인트는 남겨두되, 새 30초 interval이 덮어씀

    const lastLoc = cp.path.length > 0 ? cp.path[cp.path.length - 1] : null
    acquireWakeLock()
    startWatchPosition(lastLoc)
  }

  // ── 체크포인트 버리기 ─────────────────────────────────────────────────
  const discardCheckpoint = () => {
    localStorage.removeItem(CHECKPOINT_KEY)
    setPendingCheckpoint(null)
  }

  // ── GPS 기록 종료 + 저장 ───────────────────────────────────────────────
  const stopRecording = () => {
    // ① GPS·WakeLock 종료는 저장 성공 여부와 무관하게 반드시 먼저 실행
    const frozenDuration = durationRef.current
    const frozenDistance = distanceRef.current
    const frozenPath     = pathRef.current

    if (rideWatchRef.current !== null) {
      navigator.geolocation.clearWatch(rideWatchRef.current)
      rideWatchRef.current = null
    }
    releaseWakeLock()
    localStorage.removeItem(CHECKPOINT_KEY)

    // ② 저장 시도 — 실패해도 ③(상태 변경)은 반드시 실행
    try {
      const endTime   = new Date()
      const startCity = frozenPath.length > 0
        ? approxCity(frozenPath[0].lat, frozenPath[0].lng)
        : undefined
      const endCity = frozenPath.length > 0
        ? approxCity(frozenPath[frozenPath.length - 1].lat, frozenPath[frozenPath.length - 1].lng)
        : undefined

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
        startCity,
        endCity,
      }
      saveCourse(rideRecord)
      insertMyCourse(rideRecord).catch(e => console.warn('[RideRecord] 서버 저장 실패:', e))
    } catch (e) {
      // localStorage 용량 초과 등 저장 실패 — 로그만 남기고 진행
      console.error('[RideRecord] 로컬 저장 실패 (경로 유실될 수 있음):', e)
    } finally {
      // ③ 저장 성공/실패 무관 — 상태는 반드시 finished로 전환
      setDuration(frozenDuration)
      setDistance(frozenDistance)
      setCurrentSpeed(0)
      setStatus('finished')
    }
  }

  // ── 상태 초기화 (finished → idle) ─────────────────────────────────────
  const resetStatus = () => {
    setStatus('idle')
    setPath([])
    setDuration(0)
    setDistance(0)
    setCurrentSpeed(0)
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
      status, path, duration, distance, currentSpeed, wakeLockActive,
      pendingCheckpoint,
      startRecording, stopRecording, resetStatus,
      resumeFromCheckpoint, discardCheckpoint,
    }}>
      {children}
    </Ctx.Provider>
  )
}
