// MapPage.tsx — 기록 메뉴 메인 (UI + 네비 흐름만 담당)
// GPS 기록 상태는 RideRecordContext에서 관리 → 탭 이동해도 기록 유지
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Navigation, X } from 'lucide-react'
import { useGeolocation }            from './useGeolocation'
import MapDisplay                    from './MapDisplay'
import RideHUD                       from './RideHUD'
import { fmtTime }                   from './RideHUD'
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
    pendingCheckpoint,
    startRecording, stopRecording, resetStatus,
    resumeFromCheckpoint, discardCheckpoint,
  } = useRideRecord()

  // finished 상태에서 탭 이동 후 돌아왔을 때 시트가 다시 뜨는 버그 방지
  const statusRef = useRef(status)
  useEffect(() => { statusRef.current = status }, [status])
  useEffect(() => {
    return () => { if (statusRef.current === 'finished') resetStatus() }
  }, []) // eslint-disable-line

  const [showCountdown,          setShowCountdown]         = useState(false)
  const [showNaviSheet,          setShowNaviSheet]         = useState(false)
  const [naviPref,               setNaviPref]              = useState<NavigationType>(loadNaviPref)
  // 이어달리기 팝업 (앱 재시작 후 체크포인트 감지)
  const [showResumeSheet,        setShowResumeSheet]       = useState(false)
  const [showResumeCountdown,    setShowResumeCountdown]   = useState(false)

  const mapRef = useRef<any>(null)

  // 체크포인트 존재 시 이어달리기 팝업 표시 (idle 상태에서만)
  useEffect(() => {
    if (pendingCheckpoint && status === 'idle') {
      setShowResumeSheet(true)
    }
  }, [pendingCheckpoint, status])

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

  // ── 이어달리기 팝업: "네비로 이어 달리기" ──────────────────────────
  const handleResumeWithNavi = () => {
    setShowResumeSheet(false)
    setShowResumeCountdown(true)
  }
  const handleResumeCountdownLaunch = () => {
    setShowResumeCountdown(false)
    launchNavi(naviPref)
    resumeFromCheckpoint()
  }
  const handleResumeCountdownCancel = () => {
    setShowResumeCountdown(false)
  }
  // ── 이어달리기 팝업: "네비 없이 이어 달리기" ────────────────────────
  const handleResumeDirect = () => {
    setShowResumeSheet(false)
    resumeFromCheckpoint()
  }

  // ── 이어달리기 팝업: "새로 시작" ────────────────────────────────────
  const handleResumeNo = () => {
    setShowResumeSheet(false)
    discardCheckpoint()
  }

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

      {/* 카운트다운 팝업 (새 주행) */}
      <NavigationCountdownPopup
        isOpen={showCountdown}
        naviLabel={NAVI_OPTIONS.find((o) => o.type === naviPref)?.label ?? 'T map'}
        onLaunch={handleCountdownLaunch}
        onCancel={handleCountdownCancel}
      />

      {/* 이어달리기 카운트다운 팝업 */}
      <NavigationCountdownPopup
        isOpen={showResumeCountdown}
        naviLabel={NAVI_OPTIONS.find((o) => o.type === naviPref)?.label ?? 'T map'}
        onLaunch={handleResumeCountdownLaunch}
        onCancel={handleResumeCountdownCancel}
      />

      {/* ── 이어달리기 시트 ── */}
      {showResumeSheet && pendingCheckpoint && (
        <>
          {/* 딤 */}
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />

          {/* 시트 */}
          <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center">
            <div
              className="w-full max-w-sm rounded-t-3xl px-6 pb-10 pt-6"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              {/* 드래그 핸들 */}
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />

              {/* 아이콘 + 제목 */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-400/15">
                  <MapPin size={20} strokeWidth={1.5} style={{ color: '#f59e0b' }} />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-white">이전 주행 기록이 있어요</p>
                  <p className="text-[11px] font-light text-white/40">앱이 종료되기 전 저장된 기록입니다</p>
                </div>
              </div>

              {/* 체크포인트 정보 */}
              <div
                className="mb-5 flex items-center justify-around rounded-2xl px-4 py-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="text-center">
                  <p className="text-[22px] font-extrabold text-[#FF5A00]">
                    {pendingCheckpoint.distance.toFixed(1)}
                  </p>
                  <p className="text-[10px] font-light text-white/40">km 달렸어요</p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="text-center">
                  <p className="text-[22px] font-extrabold text-white">
                    {fmtTime(pendingCheckpoint.duration)}
                  </p>
                  <p className="text-[10px] font-light text-white/40">경과 시간</p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="text-center">
                  <p className="text-[22px] font-extrabold text-white">
                    {pendingCheckpoint.path.length}
                  </p>
                  <p className="text-[10px] font-light text-white/40">기록 포인트</p>
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleResumeWithNavi}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white active:opacity-80"
                  style={{ background: 'var(--brand)' }}
                >
                  <Navigation size={15} strokeWidth={2} />
                  네비로 이어 달리기
                </button>
                <button
                  onClick={handleResumeDirect}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold active:opacity-70"
                  style={{ background: 'var(--brand-soft)', color: 'var(--brand)', border: '1px solid var(--brand-soft)' }}
                >
                  <Navigation size={15} strokeWidth={2} />
                  네비 없이 이어 달리기
                </button>
                <button
                  onClick={handleResumeNo}
                  className="flex w-full items-center justify-center gap-1.5 rounded-2xl py-3.5 text-sm font-light active:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X size={14} strokeWidth={1.5} />
                  취소
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
