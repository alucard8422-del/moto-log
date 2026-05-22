// DriveSessionOverlay.tsx — 주행 세션 전역 UI
//
// ━━ 상태 머신 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  idle        → 대기 (아무것도 없음)
//  resume      → 앱 재실행 시 미종료 세션 감지
//  countdown   → 3·2·1 카운트다운
//  naviActive  → 내비 앱이 실제 열림(page hidden 확인) — 사용자가 내비 이용 중
//  nextSegment → 내비 복귀 + GPS 도달 확인 → 다음 구간 안내
//  notArrived  → 내비 복귀 + GPS 미도달 → 선택 요청
//  done        → 모든 구간 완료
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// ━━ 핵심 타이밍 규칙 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  saveDriveSession: 내비가 실제 열린 것이 확인된 시점(page hidden)에만 저장
//  GPS 도달 확인:   내비에서 복귀(naviActive → visible)할 때만 실행
//                   — 다른 앱 전환 등에서는 절대 실행 안 함

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence }                  from 'framer-motion'
import { Navigation, MapPin, CheckCircle, X, ChevronRight, AlertCircle, Loader2 } from 'lucide-react'
import NavigationCountdownPopup from './NavigationCountdownPopup'
import {
  loadDriveSession, saveDriveSession, clearDriveSession,
  advanceDriveSegment, hasRemainingSegments,
  type DriveSession,
} from '../lib/driveSession'
import { launchNaviSegment } from '../lib/naviUtils'
import { NAVI_OPTIONS }     from '../types/ride'

declare global {
  interface WindowEventMap {
    'moto:startDrive': CustomEvent<DriveSession>
  }
}

type OverlayMode =
  | 'idle'
  | 'resume'
  | 'countdown'
  | 'naviActive'   // 내비 앱이 실제로 열린 것이 확인된 상태
  | 'nextSegment'
  | 'notArrived'
  | 'done'

// ── 유틸 ─────────────────────────────────────────────────────────────────
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

// ── 컴포넌트 ─────────────────────────────────────────────────────────────
export default function DriveSessionOverlay() {
  const [mode,       setMode]       = useState<OverlayMode>('idle')
  const [session,    setSession]    = useState<DriveSession | null>(null)
  const [gpsChecking, setGpsChecking] = useState(false)

  // 이벤트 핸들러에서 최신값 참조
  const modeRef       = useRef<OverlayMode>('idle')
  const sessionRef    = useRef<DriveSession | null>(null)

  // 내비 실행 관련
  const naviOpenedRef    = useRef(false)   // page hidden 확인 여부
  const pendingLaunchRef = useRef(false)
  const isRelaunchRef    = useRef(false)   // 다음 구간 재실행 여부
  const launchTimerRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // mode/session 변경 시 ref 동기화
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { sessionRef.current = session }, [session])

  const naviLabel = NAVI_OPTIONS.find(n => n.type === session?.naviType)?.label ?? 'T map'

  // 구간 정보 계산
  const segInfo = session ? (() => {
    const completedIdx    = session.currentSegmentIdx - 1
    const nextIdx         = session.currentSegmentIdx
    const isLast          = session.currentSegmentIdx >= session.segments.length
    const totalWpCount    = session.segments.reduce(
      (sum, seg, i) => sum + (i === 0 ? seg.length : seg.length - 1), 0
    )
    const completedWpCount = session.segments[completedIdx]?.length ?? 0
    return { completedIdx, nextIdx, total: session.segments.length, isLast, totalWpCount, completedWpCount }
  })() : null

  // ── GPS 도달 확인 후 상태 전환 ──────────────────────────────────────────
  const checkGpsAndAdvance = useCallback(async (s: DriveSession) => {
    setGpsChecking(true)

    // 확인 대상: 현재 진행 중인 구간(currentSegmentIdx)의 마지막 점
    // → 사용자는 "이전 구간"을 완료하고 복귀한 것
    const doneSegIdx = s.currentSegmentIdx - 1
    const doneSeg    = s.segments[doneSegIdx] ?? s.segments[0]
    const endPt      = doneSeg[doneSeg.length - 1]

    try {
      const pos  = await getCurrentGps()
      const dist = haversineKm(pos.lat, pos.lng, endPt.lat, endPt.lng)
      console.log(`[DriveSession] GPS 도달 확인: ${dist.toFixed(2)}km (기준 2km)`)

      setGpsChecking(false)

      if (dist > 2.0) {
        // 아직 도달 안 함
        setSession(s)
        setMode('notArrived')
      } else {
        // 도달 → 구간 전진
        const advanced = advanceDriveSegment()
        if (!advanced) { setMode('idle'); return }
        setSession(advanced)
        setMode(hasRemainingSegments(advanced) ? 'nextSegment' : 'done')
      }
    } catch {
      console.warn('[DriveSession] GPS 실패 → 사용자 선택에 맡김')
      setGpsChecking(false)
      setSession(s)
      setMode('notArrived')
    }
  }, [])

  // ── 앱 시작 시 미종료 세션 감지 ─────────────────────────────────────────
  useEffect(() => {
    const existing = loadDriveSession()
    if (existing && hasRemainingSegments(existing)) {
      setSession(existing)
      setMode('resume')
    }
  }, [])

  // ── moto:startDrive 이벤트 수신 ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e: CustomEvent<DriveSession>) => {
      isRelaunchRef.current = false
      setSession(e.detail)
      sessionRef.current = e.detail
      setMode('countdown')
    }
    window.addEventListener('moto:startDrive', handler)
    return () => window.removeEventListener('moto:startDrive', handler)
  }, [])

  // ── visibilitychange — naviActive 상태일 때만 GPS 체크 ──────────────────
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return

      // ★ 핵심: naviActive 상태일 때만 GPS 체크 실행
      //   다른 앱 전환, 알림 확인 등에서는 절대 실행하지 않음
      if (modeRef.current !== 'naviActive') return

      const s = loadDriveSession()
      if (!s) { setMode('idle'); return }

      setMode('idle')   // GPS 체크 중에는 overlay 숨김 (gpsChecking 스피너로 대체)
      checkGpsAndAdvance(s)
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [checkGpsAndAdvance])

  // ── 카운트다운 완료 → 내비 실행 ────────────────────────────────────────
  const handleLaunch = useCallback(() => {
    const s = sessionRef.current
    if (!s || pendingLaunchRef.current) return
    pendingLaunchRef.current = true

    const seg = s.segments[s.currentSegmentIdx]
    if (!seg || seg.length < 2) {
      clearDriveSession()
      setMode('idle')
      pendingLaunchRef.current = false
      return
    }

    naviOpenedRef.current = false
    setMode('idle')   // 카운트다운 UI 닫기

    // ── 내비가 실제 열렸을 때(page hidden)만 저장 + naviActive 전환 ──────
    const onHidden = () => {
      if (document.visibilityState !== 'hidden') return
      if (naviOpenedRef.current) return

      naviOpenedRef.current = true
      clearTimeout(launchTimerRef.current)
      saveDriveSession(s)        // ← 내비 열린 것 확인 후 저장
      setMode('naviActive')      // ← GPS 체크 활성화 상태로 전환
      console.log('[DriveSession] 내비 열림 확인 → 세션 저장, naviActive 진입')
      document.removeEventListener('visibilitychange', onHidden)
    }
    document.addEventListener('visibilitychange', onHidden)

    // 6초 타임아웃: page hidden 없으면 내비 실행 실패로 판단
    launchTimerRef.current = setTimeout(() => {
      if (!naviOpenedRef.current) {
        document.removeEventListener('visibilitychange', onHidden)
        console.warn('[DriveSession] 내비 실행 확인 실패 (6s 타임아웃)')
        setMode('idle')
      }
      pendingLaunchRef.current = false
    }, 6000)

    launchNaviSegment(s.naviType, seg, s.courseTitle)
    setTimeout(() => { pendingLaunchRef.current = false }, 8000)
  }, [])

  // ── GPS 미도달 → 강제 구간 완료 ─────────────────────────────────────────
  const handleForceComplete = useCallback(() => {
    const advanced = advanceDriveSegment()
    if (!advanced) { setMode('idle'); return }
    setSession(advanced)
    setMode(hasRemainingSegments(advanced) ? 'nextSegment' : 'done')
  }, [])

  // ── 다음 구간 카운트다운 ────────────────────────────────────────────────
  const handleNextSegment = useCallback(() => {
    isRelaunchRef.current = true
    setMode('countdown')
  }, [])

  const handleResume         = useCallback(() => { setMode('countdown') }, [])
  const handleCancelCountdown = useCallback(() => { setMode('idle') }, [])
  const handleEnd            = useCallback(() => {
    clearDriveSession()
    setSession(null)
    setMode('idle')
  }, [])

  // ── 공통 Bottom Sheet 래퍼 ──────────────────────────────────────────────
  const Sheet = ({ children }: { children: React.ReactNode }) => (
    <motion.div
      className="fixed inset-0 z-[500] flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleEnd} />
      <motion.div
        className="relative z-10 w-full max-w-sm rounded-t-[2rem] border-t border-white/10 bg-[#111622] px-6 pb-10 pt-6"
        initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      >
        {/* 핸들 */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/15" />
        {children}
      </motion.div>
    </motion.div>
  )

  // ── GPS 체크 중 스피너 (overlay UI 없이 화면 구석에만 표시) ─────────────
  const GpsSpinner = () => (
    <motion.div
      className="fixed bottom-32 right-5 z-[500] flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/90 px-4 py-2.5 shadow-xl backdrop-blur-md"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
    >
      <Loader2 size={14} strokeWidth={2} className="animate-spin text-[#FF5A00]" />
      <span className="text-[11px] font-medium text-white/70">GPS 위치 확인 중…</span>
    </motion.div>
  )

  return (
    <>
      {/* GPS 체크 중 스피너 */}
      <AnimatePresence>
        {gpsChecking && <GpsSpinner />}
      </AnimatePresence>

      {/* ① 미종료 세션 재개 */}
      <AnimatePresence>
        {mode === 'resume' && session && (
          <Sheet>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400/15">
                <MapPin size={18} strokeWidth={1.5} className="text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">이전 주행이 종료되지 않았어요</p>
                <p className="mt-0.5 text-[11px] font-light text-white/40">{session.courseTitle}</p>
              </div>
            </div>

            <div className="mb-5 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
              <p className="text-[10px] font-light text-white/40">진행 중인 구간</p>
              <p className="mt-0.5 text-sm font-bold text-[#FF5A00]">
                {session.currentSegmentIdx + 1}구간 / 전체 {session.segments.length}구간
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={handleEnd}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-light text-white/50 active:opacity-70">
                <X size={14} strokeWidth={1.5} /> 종료
              </button>
              <button onClick={handleResume}
                className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-[#FF5A00] py-3.5 text-sm font-bold text-white active:opacity-80">
                <Navigation size={15} strokeWidth={2} /> 이어서 주행
              </button>
            </div>
          </Sheet>
        )}
      </AnimatePresence>

      {/* ② 다음 구간 안내 (GPS 도달 확인 완료) */}
      <AnimatePresence>
        {mode === 'nextSegment' && session && segInfo && (
          <Sheet>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF5A00]/15">
                <CheckCircle size={18} strokeWidth={1.5} className="text-[#FF5A00]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {segInfo.completedIdx + 1}구간 완료!
                </p>
                <p className="mt-0.5 text-[11px] font-light text-white/40">{session.courseTitle}</p>
              </div>
            </div>

            {/* 진행률 바 */}
            <div className="mb-4 flex items-center gap-1">
              {Array.from({ length: segInfo.total }).map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= segInfo.completedIdx ? 'bg-[#FF5A00]'
                  : i === segInfo.nextIdx   ? 'bg-[#FF5A00]/35'
                  : 'bg-white/10'
                }`} />
              ))}
            </div>

            <div className="mb-5 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] font-light leading-relaxed text-white/50">
                전체 경유지 <span className="font-semibold text-white/70">{segInfo.totalWpCount}개</span> 중{' '}
                <span className="font-semibold text-white/70">{segInfo.completedWpCount}개</span>가 포함된{' '}
                <span className="font-semibold text-[#FF5A00]">{segInfo.completedIdx + 1}구간</span>을 완료했습니다.
              </p>
              {!segInfo.isLast && (
                <p className="mt-1.5 text-[10px] font-light text-white/30">
                  {segInfo.nextIdx + 1}구간을 시작할까요?
                </p>
              )}
            </div>

            {segInfo.isLast ? (
              <button onClick={handleEnd}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A00] py-3.5 text-sm font-bold text-white active:opacity-80">
                <CheckCircle size={15} strokeWidth={2} /> 전체 주행 완료
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleEnd}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-light text-white/50 active:opacity-70">
                  <X size={14} strokeWidth={1.5} /> 종료
                </button>
                <button onClick={handleNextSegment}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-[#FF5A00] py-3.5 text-sm font-bold text-white active:opacity-80">
                  <ChevronRight size={15} strokeWidth={2.5} /> {segInfo.nextIdx + 1}구간 시작
                </button>
              </div>
            )}
          </Sheet>
        )}
      </AnimatePresence>

      {/* ③ GPS 미도달 — 아직 경유지에 안 도착 */}
      <AnimatePresence>
        {mode === 'notArrived' && session && (
          <Sheet>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400/15">
                <AlertCircle size={18} strokeWidth={1.5} className="text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">아직 목적지에 도달하지 않은 것 같아요</p>
                <p className="mt-0.5 text-[11px] font-light text-white/40">GPS 기준 2km 이상 남아있어요</p>
              </div>
            </div>

            <div className="mb-5 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] font-light leading-relaxed text-white/50">
                내비게이션을 계속 이용하거나, 이미 도달했다면 구간 완료로 표시하세요.
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={handleEnd}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl border border-white/10 bg-white/5 py-3 active:opacity-70">
                <X size={14} strokeWidth={1.5} className="text-white/40" />
                <span className="text-[10px] font-light text-white/40">주행 종료</span>
              </button>
              <button onClick={handleForceComplete}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl border border-white/10 bg-white/5 py-3 active:opacity-70">
                <CheckCircle size={14} strokeWidth={1.5} className="text-white/60" />
                <span className="text-[10px] font-light text-white/60">구간 완료</span>
              </button>
              <button onClick={() => { isRelaunchRef.current = true; setMode('countdown') }}
                className="flex flex-[1.6] items-center justify-center gap-2 rounded-2xl bg-[#FF5A00] py-3 text-sm font-bold text-white active:opacity-80">
                <Navigation size={14} strokeWidth={2} /> 계속 주행
              </button>
            </div>
          </Sheet>
        )}
      </AnimatePresence>

      {/* ④ 전체 완료 토스트 */}
      <AnimatePresence>
        {mode === 'done' && (
          <motion.div
            className="fixed bottom-32 left-1/2 z-[500] -translate-x-1/2"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            onAnimationComplete={() => {
              setTimeout(() => { clearDriveSession(); setSession(null); setMode('idle') }, 2500)
            }}
          >
            <div className="flex items-center gap-2 rounded-full border border-[#FF5A00]/20 bg-slate-950/90 px-5 py-3 shadow-xl backdrop-blur-md">
              <CheckCircle size={15} strokeWidth={2} className="text-[#FF5A00]" />
              <span className="text-sm font-bold text-[#FF5A00]">전체 경로 주행 완료!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ⑤ 카운트다운 팝업 */}
      <NavigationCountdownPopup
        isOpen={mode === 'countdown'}
        naviLabel={naviLabel}
        onLaunch={handleLaunch}
        onCancel={handleCancelCountdown}
      />
    </>
  )
}
