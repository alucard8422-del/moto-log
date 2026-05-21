// MapPage.tsx — 기록 메뉴 메인 (UI + 네비 흐름만 담당)
// GPS 기록 상태는 RideRecordContext에서 관리 → 탭 이동해도 기록 유지
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGeolocation }            from './useGeolocation'
import MapDisplay                    from './MapDisplay'
import RideHUD                       from './RideHUD'
import ErgonomicController           from './ErgonomicController'
import NavigationCountdownPopup      from '../../components/NavigationCountdownPopup'
import { loadNaviPref, launchNavi }  from '../../lib/naviUtils'
import {
  NAVI_OPTIONS, NAVI_STORAGE_KEY,
  type NavigationType,
} from './types'
import NaviSettings from './NaviSettings'
import { useRideRecord } from '../../context/RideRecordContext'

export default function MapPage() {
  const navigate = useNavigate()
  const { position } = useGeolocation()

  const {
    status, path, duration, distance, wakeLockActive,
    startRecording, stopRecording,
  } = useRideRecord()

  const [showCountdown,  setShowCountdown] = useState(false)
  const [showNaviSheet,  setShowNaviSheet] = useState(false)
  const [naviPref,       setNaviPref]      = useState<NavigationType>(loadNaviPref)

  const mapRef = useRef<any>(null)

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

  // ── 네비로 시작 → 카운트다운 팝업 ───────────────────────────────────
  const handleStart = () => setShowCountdown(true)

  // ── 카운트다운 완료 → 내비 앱 실행 + GPS 기록 ───────────────────────
  const handleCountdownLaunch = () => {
    setShowCountdown(false)
    launchNavi(naviPref)
    startRecording()
  }

  // ── 그냥 시작 → 내비 없이 GPS 기록만 ───────────────────────────────
  const handleStartDirect = () => startRecording()

  // ── 네비 선택 시트 ──────────────────────────────────────────────────
  const handleNaviSelect = () => setShowNaviSheet(true)
  const handleNaviSave   = () => {
    localStorage.setItem(NAVI_STORAGE_KEY, naviPref)
    setShowNaviSheet(false)
  }

  // ── 카운트다운 취소 ──────────────────────────────────────────────────
  const handleCountdownCancel = () => setShowCountdown(false)

  // ── 정지 버튼 → 컨텍스트 stopRecording (저장까지 처리) ───────────────
  const handleStop = () => stopRecording()

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
