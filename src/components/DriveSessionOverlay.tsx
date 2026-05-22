// DriveSessionOverlay.tsx — 주행 세션 전역 UI
// ① 앱 재실행 시 미종료 세션 감지 → "이어서 주행" 팝업
// ② 내비에서 앱으로 복귀(visibilitychange) → GPS 도달 확인 → "다음 구간" 시트
// ③ 주행하기 버튼 → 카운트다운 → 내비 실행
//
// [세션 저장 시점]
//   내비 앱이 실제로 열릴 때(page hidden) → saveDriveSession 호출
//   내비가 열리지 않으면 저장 안 함 → 앱 새로고침 시 잔여 세션 없음
//
// [구간 완료 인식]
//   복귀 시 GPS로 현재 위치와 구간 목적지 거리 측정
//   2km 이내면 자동 완료, 아니면 사용자에게 선택지 제공

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation, MapPin, CheckCircle, X, ChevronRight, AlertCircle } from 'lucide-react'
import NavigationCountdownPopup from './NavigationCountdownPopup'
import {
  loadDriveSession, saveDriveSession, clearDriveSession,
  advanceDriveSegment, hasRemainingSegments,
  type DriveSession,
} from '../lib/driveSession'
import { launchNaviSegment } from '../lib/naviUtils'
import { NAVI_OPTIONS } from '../types/ride'

declare global {
  interface WindowEventMap {
    'moto:startDrive': CustomEvent<DriveSession>
  }
}

type OverlayMode =
  | 'idle'
  | 'resume'       // 앱 재실행 시 미종료 세션
  | 'nextSegment'  // 내비 복귀 후 다음 구간
  | 'notArrived'   // GPS상 아직 목적지 미도달
  | 'countdown'    // 카운트다운 중
  | 'done'         // 모든 구간 완료

// ── Haversine 거리 계산 (km) ──────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

// ── GPS 현재 위치 (최대 6초 대기) ─────────────────────────────────────────
function getCurrentGps(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('no geolocation')); return }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { timeout: 6000, maximumAge: 10000 }
    )
  })
}

export default function DriveSessionOverlay() {
  const [mode,    setMode]    = useState<OverlayMode>('idle')
  const [session, setSession] = useState<DriveSession | null>(null)
  const pendingLaunchRef  = useRef(false)
  const lastLaunchedAt    = useRef(0)
  const isRelaunchRef     = useRef(false)
  // 내비가 실제 열렸는지 (page hidden 감지)
  const naviOpenedRef     = useRef(false)
  // 현재 세션 ref (visibilitychange 핸들러에서 최신값 참조용)
  const sessionRef        = useRef<DriveSession | null>(null)

  useEffect(() => { sessionRef.current = session }, [session])

  const naviLabel = NAVI_OPTIONS.find(n => n.type === session?.naviType)?.label ?? 'T map'

  const segInfo = session
    ? {
        completedIdx:    session.currentSegmentIdx - 1,
        nextIdx:         session.currentSegmentIdx,
        total:           session.segments.length,
        isLast:          session.currentSegmentIdx >= session.segments.length,
        completedWpCount: session.segments[session.currentSegmentIdx - 1]?.length ?? 0,
        totalWpCount:    session.segments.reduce(
          (sum, seg, i) => sum + (i === 0 ? seg.length : seg.length - 1), 0
        ),
      }
    : null

  // ── 앱 시작: 미종료 세션 감지 ────────────────────────────────────────────
  useEffect(() => {
    const existing = loadDriveSession()
    if (existing && hasRemainingSegments(existing)) {
      setSession(existing)
      setMode('resume')
    }
  }, [])

  // ── 외부 "주행 시작" 이벤트 수신 ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e: CustomEvent<DriveSession>) => {
      setSession(e.detail)
      sessionRef.current = e.detail
      setMode('countdown')
    }
    window.addEventListener('moto:startDrive', handler)
    return () => window.removeEventListener('moto:startDrive', handler)
  }, [])

  // ── 앱 복귀 감지 (visibilitychange) ───────────────────────────────────────
  useEffect(() => {
    const onVisibility = async () => {
      if (document.visibilityState !== 'visible') return
      const s = loadDriveSession()
      if (!s) return

      // 4초 이내 복귀 → 내비 실행 실패로 간주
      if (Date.now() - lastLaunchedAt.current < 4000) return

      // ── GPS로 구간 목적지 도달 여부 확인 ──────────────────────────────
      const seg = s.segments[s.currentSegmentIdx]  // 현재(다음에 탈) 구간
      // 실제로 완료된 구간의 마지막 경유지 = 이전 구간의 마지막 점
      const prevSeg = s.segments[s.currentSegmentIdx - 1] ?? seg
      const endPt   = prevSeg[prevSeg.length - 1]

      try {
        const pos  = await getCurrentGps()
        const dist = haversineKm(pos.lat, pos.lng, endPt.lat, endPt.lng)

        if (dist > 2.0) {
          // 목적지에서 2km 이상 떨어짐 → 아직 안 도달
          setSession(s)
          setMode('notArrived')
          return
        }
      } catch {
        // GPS 실패 → 사용자에게 선택지 제공
        setSession(s)
        setMode('notArrived')
        return
      }

      // GPS 확인 완료 (2km 이내) → 구간 전진
      const advanced = advanceDriveSegment()
      if (!advanced) return

      if (hasRemainingSegments(advanced)) {
        setSession(advanced)
        setMode('nextSegment')
      } else {
        setSession(advanced)
        setMode('done')
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // ── 카운트다운 완료 → 내비 실행 ──────────────────────────────────────────
  const handleLaunch = useCallback(() => {
    const s = sessionRef.current
    if (!s || pendingLaunchRef.current) return
    pendingLaunchRef.current = true
    setMode('idle')

    const seg = s.segments[s.currentSegmentIdx]
    if (!seg) { clearDriveSession(); return }

    lastLaunchedAt.current = Date.now()
    naviOpenedRef.current  = false

    // ── 내비 앱이 실제 열렸을 때(page hidden)만 세션 저장 ──────────────
    const onHidden = () => {
      if (document.visibilityState === 'hidden' && !naviOpenedRef.current) {
        naviOpenedRef.current = true
        saveDriveSession(s)   // ← 내비가 열린 것이 확인된 시점에만 저장
        document.removeEventListener('visibilitychange', onHidden)
      }
    }
    document.addEventListener('visibilitychange', onHidden)

    // 3초 뒤에도 hidden 안 됐으면 → 내비 미실행 → 리스너 제거
    setTimeout(() => {
      if (!naviOpenedRef.current) {
        document.removeEventListener('visibilitychange', onHidden)
        pendingLaunchRef.current = false
        // 내비가 안 열렸으면 이전 상태로 복귀
        setMode(isRelaunchRef.current ? 'nextSegment' : 'idle')
      }
    }, 3000)

    launchNaviSegment(s.naviType, seg, s.courseTitle)
    setTimeout(() => { pendingLaunchRef.current = false }, 5000)
  }, [])

  // ── "도달 안 함" 상태에서 강제 구간 완료 ────────────────────────────────
  const handleForceComplete = useCallback(() => {
    const advanced = advanceDriveSegment()
    if (!advanced) { setMode('idle'); return }
    if (hasRemainingSegments(advanced)) {
      setSession(advanced); setMode('nextSegment')
    } else {
      setSession(advanced); setMode('done')
    }
  }, [])

  // ── 다음 구간 시작 ────────────────────────────────────────────────────────
  const handleNextSegment = useCallback(() => {
    isRelaunchRef.current = true
    setMode('countdown')
  }, [])

  const handleResume = useCallback(() => { setMode('countdown') }, [])

  const handleEnd = useCallback(() => {
    clearDriveSession()
    setSession(null)
    setMode('idle')
  }, [])

  const handleCancelCountdown = useCallback(() => {
    setMode(isRelaunchRef.current ? 'nextSegment' : 'idle')
  }, [])

  // ── 공통 시트 래퍼 ────────────────────────────────────────────────────────
  const Sheet = ({ children }: { children: React.ReactNode }) => (
    <motion.div
      className="fixed inset-0 z-[500] flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleEnd} />
      <motion.div
        className="relative z-10 w-full max-w-sm rounded-t-3xl border-t border-white/10 bg-[#111622] px-6 pb-safe-bottom pt-6"
        initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      >
        {children}
      </motion.div>
    </motion.div>
  )

  return (
    <>
      {/* ── ① 미종료 세션 재개 ── */}
      <AnimatePresence>
        {mode === 'resume' && session && (
          <Sheet>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/15">
                <MapPin size={18} strokeWidth={1.5} className="text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">이전 주행이 종료되지 않았어요</p>
                <p className="text-[11px] font-light text-white/40">{session.courseTitle}</p>
              </div>
            </div>
            <div className="mb-5 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
              <p className="text-[10px] font-light text-white/40">진행 구간</p>
              <p className="mt-0.5 text-sm font-bold text-[#FF5A00]">
                {session.currentSegmentIdx + 1}구간 / 전체 {session.segments.length}구간
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleEnd}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-light text-white/50 active:opacity-70">
                <X size={14} strokeWidth={1.5} /> 주행 종료
              </button>
              <button onClick={handleResume}
                className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-[#FF5A00] py-3.5 text-sm font-bold text-white active:opacity-80">
                <Navigation size={15} strokeWidth={2} /> 이어서 주행
              </button>
            </div>
          </Sheet>
        )}
      </AnimatePresence>

      {/* ── ② 다음 구간 안내 ── */}
      <AnimatePresence>
        {mode === 'nextSegment' && session && segInfo && (
          <Sheet>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF5A00]/15">
                <Navigation size={18} strokeWidth={1.5} className="text-[#FF5A00]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{segInfo.completedIdx + 1}구간 안내 완료!</p>
                <p className="text-[11px] font-light text-white/40">{session.courseTitle}</p>
              </div>
            </div>
            {/* 프로그레스 */}
            <div className="mb-3 flex items-center gap-1.5">
              {Array.from({ length: segInfo.total }).map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= segInfo.completedIdx ? 'bg-[#FF5A00]'
                  : i === segInfo.nextIdx   ? 'bg-[#FF5A00]/40'
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
                <p className="mt-1 text-[10px] font-light text-white/30">
                  다음 <span className="text-white/50">{segInfo.nextIdx + 1}구간</span>을 안내할까요?
                </p>
              )}
            </div>
            {segInfo.isLast ? (
              <button onClick={handleEnd}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A00] py-3.5 text-sm font-bold text-white active:opacity-80">
                <CheckCircle size={15} strokeWidth={2} /> 주행 완료
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleEnd}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-light text-white/50 active:opacity-70">
                  <X size={14} strokeWidth={1.5} /> 주행 종료
                </button>
                <button onClick={handleNextSegment}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-[#FF5A00] py-3.5 text-sm font-bold text-white active:opacity-80">
                  <ChevronRight size={15} strokeWidth={2.5} /> 다음 구간 시작
                </button>
              </div>
            )}
          </Sheet>
        )}
      </AnimatePresence>

      {/* ── ③ GPS 미도달 — 아직 경유지에 안 왔어요 ── */}
      <AnimatePresence>
        {mode === 'notArrived' && session && (
          <Sheet>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/15">
                <AlertCircle size={18} strokeWidth={1.5} className="text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">아직 경유지에 도달하지 않은 것 같아요</p>
                <p className="text-[11px] font-light text-white/40">GPS 기준 목적지까지 2km 이상 남아있어요</p>
              </div>
            </div>
            <div className="mb-5 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] font-light leading-relaxed text-white/50">
                내비게이션으로 계속 주행하거나, 도달했다면 구간 완료로 표시할 수 있어요.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleEnd}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-light text-white/50 active:opacity-70">
                <X size={14} strokeWidth={1.5} /> 주행 종료
              </button>
              <button onClick={handleForceComplete}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-light text-white/70 active:opacity-70">
                <CheckCircle size={14} strokeWidth={1.5} /> 구간 완료
              </button>
              <button onClick={() => { setMode('countdown'); isRelaunchRef.current = true }}
                className="flex flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-[#FF5A00] py-3.5 text-sm font-bold text-white active:opacity-80">
                <Navigation size={14} strokeWidth={2} /> 계속 주행
              </button>
            </div>
          </Sheet>
        )}
      </AnimatePresence>

      {/* ── ④ 주행 완료 토스트 ── */}
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

      {/* ── ⑤ 카운트다운 팝업 ── */}
      <NavigationCountdownPopup
        isOpen={mode === 'countdown'}
        naviLabel={naviLabel}
        onLaunch={handleLaunch}
        onCancel={handleCancelCountdown}
      />
    </>
  )
}
