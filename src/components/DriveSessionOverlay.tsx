// DriveSessionOverlay.tsx — 주행 세션 전역 UI
// Layout 안에 한 번만 렌더링.
// ① 앱 재실행 시 미종료 세션 감지 → "이어서 주행" 팝업
// ② 네비에서 앱으로 복귀(visibilitychange) → "다음 구간" 시트
// ③ 주행하기 버튼 → 카운트다운 → 네비 실행

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation, MapPin, CheckCircle, X, ChevronRight } from 'lucide-react'
import NavigationCountdownPopup from './NavigationCountdownPopup'
import {
  loadDriveSession, clearDriveSession,
  advanceDriveSegment, hasRemainingSegments,
  type DriveSession,
} from '../lib/driveSession'
import { launchNaviSegment } from '../lib/naviUtils'
import { NAVI_OPTIONS } from '../types/ride'

// ── 외부에서 "주행 시작" 요청 이벤트 ────────────────────────────────────
// MyRoutesPage → CustomEvent('moto:startDrive', { detail: DriveSession })
declare global {
  interface WindowEventMap {
    'moto:startDrive': CustomEvent<DriveSession>
  }
}

type OverlayMode =
  | 'idle'
  | 'resume'        // 앱 재실행 시 미종료 세션
  | 'nextSegment'   // 네비 복귀 후 다음 구간
  | 'countdown'     // 카운트다운 중
  | 'done'          // 모든 구간 완료

export default function DriveSessionOverlay() {
  const [mode,    setMode]    = useState<OverlayMode>('idle')
  const [session, setSession] = useState<DriveSession | null>(null)
  const pendingLaunchRef      = useRef(false)  // countdown 후 실행 플래그

  const naviLabel = NAVI_OPTIONS.find(n => n.type === session?.naviType)?.label ?? 'T map'

  // ── 세션의 현재 구간 정보 ─────────────────────────────────────────────
  const segInfo = session
    ? {
        current: session.currentSegmentIdx + 1,          // 표시용 1-based
        total:   session.segments.length,
        isLast:  session.currentSegmentIdx >= session.segments.length - 1,
      }
    : null

  // ── 앱 시작 시: 미종료 세션 감지 ─────────────────────────────────────
  useEffect(() => {
    const existing = loadDriveSession()
    if (existing && hasRemainingSegments(existing)) {
      setSession(existing)
      setMode('resume')
    }
  }, [])

  // ── 외부 "주행 시작" 이벤트 수신 ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: CustomEvent<DriveSession>) => {
      setSession(e.detail)
      setMode('countdown')
    }
    window.addEventListener('moto:startDrive', handler)
    return () => window.removeEventListener('moto:startDrive', handler)
  }, [])

  // ── 앱 복귀 감지 (visibilitychange) ──────────────────────────────────
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const s = loadDriveSession()
      if (!s) return

      if (hasRemainingSegments(s)) {
        setSession(s)
        setMode('nextSegment')
      } else {
        // 모든 구간 완료
        setSession(s)
        setMode('done')
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // ── 카운트다운 완료 → 네비 실행 ──────────────────────────────────────
  const handleLaunch = useCallback(() => {
    if (!session || pendingLaunchRef.current) return
    pendingLaunchRef.current = true
    setMode('idle')

    const seg = session.segments[session.currentSegmentIdx]
    if (!seg) { clearDriveSession(); return }

    // 세션 전진
    const updated = advanceDriveSegment()
    setSession(updated)

    // 네비 실행
    launchNaviSegment(session.naviType, seg, session.courseTitle)

    // 짧은 딜레이 후 플래그 해제 (연속 실행 방지)
    setTimeout(() => { pendingLaunchRef.current = false }, 2000)
  }, [session])

  // ── 다음 구간 시작 ────────────────────────────────────────────────────
  const handleNextSegment = useCallback(() => {
    if (!session) return
    setMode('countdown')
  }, [session])

  // ── 주행 재개 ─────────────────────────────────────────────────────────
  const handleResume = useCallback(() => {
    setMode('countdown')
  }, [])

  // ── 주행 종료 ─────────────────────────────────────────────────────────
  const handleEnd = useCallback(() => {
    clearDriveSession()
    setSession(null)
    setMode('idle')
  }, [])

  // ── 카운트다운 취소 ───────────────────────────────────────────────────
  const handleCancelCountdown = useCallback(() => {
    setMode(session ? 'nextSegment' : 'idle')
  }, [session])

  return (
    <>
      {/* ── ① 미종료 세션 재개 팝업 ── */}
      <AnimatePresence>
        {mode === 'resume' && session && (
          <motion.div
            className="fixed inset-0 z-[500] flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={handleEnd}
            />
            <motion.div
              className="relative z-10 w-full max-w-sm rounded-t-3xl border-t border-white/10 bg-[#111622] px-6 pb-safe-bottom pt-6"
              initial={{ y: 80 }}
              animate={{ y: 0 }}
              exit={{ y: 80 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            >
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
                  {session.currentSegmentIdx + 1} / {session.segments.length} 구간
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleEnd}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-light text-white/50 active:opacity-70"
                >
                  <X size={14} strokeWidth={1.5} />
                  주행 종료
                </button>
                <button
                  onClick={handleResume}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-[#FF5A00] py-3.5 text-sm font-bold text-white active:opacity-80"
                >
                  <Navigation size={15} strokeWidth={2} />
                  이어서 주행
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ② 다음 구간 안내 시트 ── */}
      <AnimatePresence>
        {mode === 'nextSegment' && session && segInfo && (
          <motion.div
            className="fixed inset-0 z-[500] flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={handleEnd}
            />
            <motion.div
              className="relative z-10 w-full max-w-sm rounded-t-3xl border-t border-white/10 bg-[#111622] px-6 pb-safe-bottom pt-6"
              initial={{ y: 80 }}
              animate={{ y: 0 }}
              exit={{ y: 80 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF5A00]/15">
                  <Navigation size={18} strokeWidth={1.5} className="text-[#FF5A00]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {segInfo.current - 1}구간 완료!
                  </p>
                  <p className="text-[11px] font-light text-white/40">{session.courseTitle}</p>
                </div>
              </div>

              {/* 구간 프로그레스 */}
              <div className="mb-4 flex items-center gap-1.5">
                {Array.from({ length: segInfo.total }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i < session.currentSegmentIdx
                        ? 'bg-[#FF5A00]'
                        : i === session.currentSegmentIdx
                        ? 'bg-[#FF5A00]/40'
                        : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>

              <p className="mb-5 text-[11px] font-light text-white/40">
                전체 {segInfo.total}구간 중 {session.currentSegmentIdx}구간을 완료했어요.
                {!segInfo.isLast && ` 다음 ${session.currentSegmentIdx + 1}구간을 안내할까요?`}
              </p>

              {segInfo.isLast ? (
                /* 마지막 구간 완료 */
                <button
                  onClick={handleEnd}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A00] py-3.5 text-sm font-bold text-white active:opacity-80"
                >
                  <CheckCircle size={15} strokeWidth={2} />
                  주행 완료
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleEnd}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-light text-white/50 active:opacity-70"
                  >
                    <X size={14} strokeWidth={1.5} />
                    주행 종료
                  </button>
                  <button
                    onClick={handleNextSegment}
                    className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-[#FF5A00] py-3.5 text-sm font-bold text-white active:opacity-80"
                  >
                    <ChevronRight size={15} strokeWidth={2.5} />
                    다음 구간 시작
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ③ 주행 완료 토스트 ── */}
      <AnimatePresence>
        {mode === 'done' && (
          <motion.div
            className="fixed bottom-32 left-1/2 z-[500] -translate-x-1/2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
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

      {/* ── ④ 카운트다운 팝업 ── */}
      <NavigationCountdownPopup
        isOpen={mode === 'countdown'}
        naviLabel={naviLabel}
        onLaunch={handleLaunch}
        onCancel={handleCancelCountdown}
      />
    </>
  )
}
