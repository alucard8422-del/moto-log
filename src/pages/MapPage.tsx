// MapPage.tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Satellite, Locate } from 'lucide-react'
import type { Map as LeafletMap } from 'leaflet'

function fmtTime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function HUDCol({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className="text-3xl font-bold leading-none text-[#2DD4BF] md:text-5xl [@media(orientation:landscape)]:text-2xl"
        style={{
          fontFamily: "'Orbitron', sans-serif",
          textShadow: '0 0 10px rgba(45,212,191,0.5)',
        }}
      >
        {value}
      </span>
      <span
        className="text-[9px] font-medium uppercase tracking-widest text-white/50 [@media(orientation:landscape)]:text-[8px]"
        style={{ fontFamily: "'Urbanist', sans-serif" }}
      >
        {label}
      </span>
    </div>
  )
}
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
  const mapRef = useRef<LeafletMap | null>(null)

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
      className="relative w-screen overflow-hidden bg-[#0B0F19] touch-none"
      style={{ height: '100dvh', overscrollBehavior: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* [0층] 지도 엔진 — fixed + z-0 으로 완전히 바닥에 격리 */}
      <div className="fixed inset-0 w-full h-full z-0">
        <MapDisplay
          path={path}
          currentPosition={position}
          isRiding={status === 'riding'}
          gpsStatus={gpsStatus}
          mapRef={mapRef}
        />
      </div>

      {/* [1층] 우측 상단 — GPS + Locate 아이콘 전용 원형 버튼 수직 배치 */}
      <div className="pointer-events-none fixed top-4 right-4 z-10 flex flex-col items-center gap-2">
        {/* GPS 상태 표시등 */}
        <div className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#161B26]/80 backdrop-blur-md">
          <Satellite
            size={16}
            strokeWidth={1.5}
            className={gpsStatus === 'connected' ? 'text-teal-400' : 'animate-pulse text-white/30'}
          />
        </div>

        {/* 현재 위치로 이동 */}
        <button
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#161B26]/80 backdrop-blur-md transition-opacity active:opacity-70"
          onClick={() => {
            if (position) {
              mapRef.current?.flyTo([position.lat, position.lng], 15, { duration: 0.8 })
            }
          }}
        >
          <Locate size={16} strokeWidth={1.5} className="text-teal-400" />
        </button>
      </div>

      {/* [1.5층] 주행 중 투명 HUD
           · left-0 right-[5rem]: 우측 GPS버튼(w-10=2.5rem, right-4=1rem) + 여백 확보
           · justify-center: 가용 공간 안에서만 중앙 정렬 → 우측 침범 원천 차단 */}
      {status === 'riding' && (() => {
        const avg = duration > 0 ? distance / (duration / 3600) : 0
        return (
          <div className="pointer-events-none fixed top-8 left-0 right-[5rem] z-20 flex justify-center gap-x-6 md:gap-x-12 [@media(orientation:landscape)]:top-3">
            <HUDCol value={fmtTime(duration)} label="주행시간" />
            <HUDCol value={distance.toFixed(2)} label="거리(km)" />
            <HUDCol value={avg.toFixed(0)} label="평균속도" />
          </div>
        )
      })()}

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
