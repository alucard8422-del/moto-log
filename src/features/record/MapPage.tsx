// MapPage.tsx — 기록 메뉴 메인 (UI + 네비 흐름만 담당)
// GPS 기록 상태는 RideRecordContext에서 관리 → 탭 이동해도 기록 유지
import { useEffect, useRef, useState } from 'react'
import { useNavigate }                 from 'react-router-dom'
import { MapPin, Navigation, X, Route, Loader2 } from 'lucide-react'
import { useGeolocation }              from './useGeolocation'
import MapDisplay                      from './MapDisplay'
import RideHUD                         from './RideHUD'
import { fmtTime }                     from './RideHUD'
import ErgonomicController             from './ErgonomicController'
import NavigationCountdownPopup        from '../../components/NavigationCountdownPopup'
import { loadNaviPref, launchNavi }    from '../../lib/naviUtils'
import {
  NAVI_OPTIONS, NAVI_STORAGE_KEY,
  type NavigationType,
} from './types'
import NaviSettings  from './NaviSettings'
import { useRideRecord } from '../../context/RideRecordContext'
import {
  loadDriveSession, hasRemainingSegments,
  getCurrentSegmentEndpoint, clearDriveSession,
  type DriveSession,
} from '../../lib/driveSession'

// ── GPS 유틸 (DriveSession 이어달리기 체크용) ────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function getCurrentGps(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('no geolocation')); return }
    navigator.geolocation.getCurrentPosition(
      p  => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { timeout: 8000, maximumAge: 15000 },
    )
  })
}

export default function MapPage() {
  const navigate = useNavigate()
  const { position, errorCode: gpsError, loading: gpsLoading } = useGeolocation()

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
  // 체크포인트 이어달리기 (앱 재시작 후 GPS 기록 복구)
  const [showResumeSheet,        setShowResumeSheet]       = useState(false)
  const [showResumeCountdown,    setShowResumeCountdown]   = useState(false)
  // 드라이브세션 이어달리기 (계획 경로 기록 재개)
  const [showContinueSheet,      setShowContinueSheet]     = useState(false)
  const [continueSession,        setContinueSession]       = useState<DriveSession | null>(null)
  const [gpsChecking,            setGpsChecking]           = useState(false)

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

  // ── 네비로 시작 → 드라이브세션 체크 → 카운트다운 팝업 ────────────────
  const handleStart = async () => {
    // pendingCheckpoint 있으면 기존 체크포인트 복구 흐름 우선
    if (pendingCheckpoint) { setShowResumeSheet(true); return }

    const session = loadDriveSession()
    if (!session || !hasRemainingSegments(session)) {
      setShowCountdown(true)
      return
    }

    // ── 드라이브세션 존재 → GPS로 경유지 근접 여부 확인 ─────────────────
    setGpsChecking(true)
    try {
      const endpoint = getCurrentSegmentEndpoint(session)
      if (!endpoint) { setGpsChecking(false); setShowCountdown(true); return }

      const pos  = await getCurrentGps()
      const dist = haversineKm(pos.lat, pos.lng, endpoint.lat, endpoint.lng)
      setGpsChecking(false)

      if (dist > 30) {
        // 30km 이상 → 전혀 다른 곳: 세션 초기화 후 새 주행
        clearDriveSession()
        setShowCountdown(true)
      } else {
        // 30km 이내 → 경로 근처: 이어달리기 팝업
        setContinueSession(session)
        setShowContinueSheet(true)
      }
    } catch {
      // GPS 실패 → 그냥 새 주행
      setGpsChecking(false)
      setShowCountdown(true)
    }
  }

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

  // ── 드라이브세션 이어달리기 ──────────────────────────────────────────
  const handleContinueRiding = () => {
    setShowContinueSheet(false)
    if (!continueSession) return
    startRecording()
    // DriveSessionOverlay가 카운트다운 + 내비 실행을 담당
    window.dispatchEvent(new CustomEvent('moto:startDrive', { detail: continueSession }))
  }
  const handleContinueCancel = () => {
    // 취소: 기록 시작 안 함, 드라이브세션 유지, idle 상태 유지
    setShowContinueSheet(false)
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
          gpsLoading={gpsLoading}
          gpsError={gpsError}
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

      {/* ── GPS 체크 중 스피너 ── */}
      {gpsChecking && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-[#111622]/90 px-8 py-7 shadow-xl">
            <Loader2 size={28} strokeWidth={1.5} className="animate-spin text-[#FF5A00]" />
            <p className="text-[13px] font-medium text-white/70">현재 위치 확인 중…</p>
          </div>
        </div>
      )}

      {/* ── 드라이브세션 이어달리기 시트 ── */}
      {showContinueSheet && continueSession && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" onClick={handleContinueCancel} />
          <div className="fixed inset-x-0 bottom-0 z-[80] flex justify-center">
            <div className="w-full max-w-sm rounded-t-[2rem] bg-[#111622] px-6 pb-10 pt-6">
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/15" />

              {/* 아이콘 + 제목 */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FF5A00]/15">
                  <Route size={20} strokeWidth={1.5} className="text-[#FF5A00]" />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-white">설정한 경유지에 도착하지 않았습니다</p>
                  <p className="mt-0.5 text-[11px] font-light text-white/40">계속 이어 달리겠습니까?</p>
                </div>
              </div>

              {/* 경로 정보 */}
              <div className="mb-5 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <p className="text-[10px] font-light text-white/40">이어달릴 경로</p>
                <p className="mt-0.5 text-sm font-bold text-white">{continueSession.courseTitle}</p>
                <p className="mt-1 text-[11px] font-light text-white/40">
                  {continueSession.currentSegmentIdx + 1}구간 / 전체 {continueSession.segments.length}구간
                </p>
              </div>

              {/* 버튼 */}
              <div className="flex gap-2">
                <button
                  onClick={handleContinueCancel}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-light text-white/50 active:opacity-70"
                >
                  <X size={14} strokeWidth={1.5} /> 취소하기
                </button>
                <button
                  onClick={handleContinueRiding}
                  className="flex flex-[1.8] items-center justify-center gap-2 rounded-2xl bg-[#FF5A00] py-3.5 text-sm font-bold text-white active:opacity-80"
                >
                  <Navigation size={15} strokeWidth={2} /> 이어 달리기
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── 체크포인트 이어달리기 시트 ── */}
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
