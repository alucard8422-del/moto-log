// ErgonomicController.tsx — 기록 탭 위 ▲ 삼각형 + 수직 팬 메뉴 + 주행 정지 버튼
// ▲ 삼각형: 탭바 top edge에 절반 걸치는 구조 (상단=지도, 하단=탭바)
// 팬 버튼 + ▲ 전부 동일 수직 중심축 정렬

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Square, Flag, Timer, Route, Gauge, Compass, Settings, Play, AlertTriangle } from 'lucide-react'
import { type RideStatus } from './types'

interface Props {
  status:        RideStatus
  duration:      number
  distance:      number
  onStart:       () => void
  onStartDirect: () => void
  onNaviSelect:  () => void
  onStop:        () => void
  onGoToCourses: () => void
}

// ── 수직 팬 아이템 (아래 → 위 순서) ─────────────────────────────────────
const FAN_ITEMS = [
  { key: 'direct',      Icon: Play,     label: '바로 시작',   fill: true,  color: '#FF5A00' },
  { key: 'navi',        Icon: Compass,  label: '내비로 시작', fill: false, color: '#0F172A' },
  { key: 'navi-select', Icon: Settings, label: '내비 선택',   fill: false, color: '#475569' },
] as const

// ── 글래스 스타일 ────────────────────────────────────────────────────────
const glass = {
  background:           'rgba(255,255,255,0.92)',
  backdropFilter:       'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border:               '1px solid rgba(255,255,255,0.65)',
  boxShadow:            '0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
} as const

// ── 레이아웃 상수 ────────────────────────────────────────────────────────
const TAB_BAR_BOTTOM  = 20          // bottom-5 (px)
const TAB_BAR_H       = 84          // 탭바 높이
const TAB_BAR_TOP     = TAB_BAR_BOTTOM + TAB_BAR_H   // 104px — 탭바 상단 edge

// ▲ 삼각형: 크기 절반으로, 중심 Y = 탭바 상단 edge
const TRI_W           = 16          // 삼각형 너비 (기존 32 → 16)
const TRI_H           = 12          // 삼각형 높이 (기존 24 → 12)
const TRI_BASE_BOTTOM = TAB_BAR_TOP - TRI_H / 2      // 98px
const TRI_TIP_BOTTOM  = TAB_BAR_TOP + TRI_H / 2      // 110px

// 터치 영역
const TOUCH_W         = 72
const TOUCH_BOTTOM    = TAB_BAR_BOTTOM                // 20px
const TOUCH_H         = TRI_TIP_BOTTOM + 12 - TOUCH_BOTTOM  // 102px

// 팬 버튼
const FAN_BTN_SIZE    = 58
const FAN_GAP         = 12
const FAN_BASE_BOTTOM = TRI_TIP_BOTTOM + 10           // 120px

const TRI_BOTTOM_IN_TOUCH = TRI_BASE_BOTTOM - TOUCH_BOTTOM  // 78px

// ── "기록" 탭 center 정렬 CSS calc ─────────────────────────────────────
// 탭바: justify-around + px-1(4px씩) → 첫 번째 탭 center = 4px + (100%-8px)/10
// 팬 버튼 left: 버튼 circle 왼쪽 edge = center - FAN_BTN_SIZE/2
const FAN_LEFT   = `calc(4px + (100% - 8px) / 10 - ${FAN_BTN_SIZE / 2}px)`
// 터치 div left: div 왼쪽 edge = center - TOUCH_W/2
const TOUCH_LEFT = `calc(4px + (100% - 8px) / 10 - ${TOUCH_W / 2}px)`

// ── 주행 완료 포맷 ───────────────────────────────────────────────────────
function fmt(s: number): string {
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// ── 주행 완료 시트 ───────────────────────────────────────────────────────
function RideCompleteSheet({
  duration, distance, onGoToCourses,
}: { duration: number; distance: number; onGoToCourses: () => void }) {
  const [open, setOpen] = useState(false)
  useState(() => { setTimeout(() => setOpen(true), 16) })

  const avg = duration > 0 ? distance / (duration / 3600) : 0
  const rows = [
    { icon: <Timer  size={14} strokeWidth={1.5} className="text-[#FF5A00]" />, label: '주행 시간', value: fmt(duration) },
    { icon: <Route  size={14} strokeWidth={1.5} className="text-[#FF5A00]" />, label: '주행 거리', value: `${distance.toFixed(2)} km` },
    { icon: <Gauge  size={14} strokeWidth={1.5} className="text-[#FF5A00]" />, label: '평균 속도', value: `${avg.toFixed(0)} km/h` },
  ]

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="mx-auto max-w-sm rounded-t-3xl bg-[#161B26]/98 px-6 pt-5 pb-12 backdrop-blur-xl">
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/15" />
          <div className="mb-6 flex items-center gap-2">
            <Flag size={13} strokeWidth={1.5} className="text-[#FF5A00]" />
            <span className="text-[10px] font-light uppercase tracking-widest text-white/30">Ride Complete</span>
          </div>
          <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-white/5 px-5 py-4">
            {rows.map(({ icon, label, value }, i) => (
              <div key={label}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-sm font-light text-white/40">{label}</span>
                  </div>
                  <span className="text-sm font-bold text-[#FF5A00]">{value}</span>
                </div>
                {i < rows.length - 1 && <div className="mt-4 h-px bg-white/5" />}
              </div>
            ))}
          </div>
          <button
            onClick={onGoToCourses}
            className="w-full rounded-3xl bg-[#FF5A00] py-4 text-sm font-bold text-white transition-opacity active:opacity-80"
          >
            내 경로에 저장하기
          </button>
        </div>
      </div>
    </>
  )
}

// ── ▲ 삼각형 SVG ─────────────────────────────────────────────────────────
function Triangle({ open }: { open: boolean }) {
  return (
    <div
      style={{
        position:  'absolute',
        bottom:    TRI_BOTTOM_IN_TOUCH,
        left:      '50%',
        transform: 'translateX(-50%)',
      }}
    >
      <motion.svg
        width={TRI_W}
        height={TRI_H}
        viewBox={`0 0 ${TRI_W} ${TRI_H}`}
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        style={{
          display: 'block',
          filter:  open
            ? 'drop-shadow(0 0 6px rgba(255,90,0,0.55))'
            : 'drop-shadow(0 2px 6px rgba(255,90,0,0.40))',
          transformOrigin: `${TRI_W / 2}px ${TRI_H / 2}px`,
        }}
      >
        {/* ▲ 꼭짓점=상단 중앙, 밑변=하단 */}
        <polygon
          points={`${TRI_W / 2},2 ${TRI_W - 2},${TRI_H - 2} 2,${TRI_H - 2}`}
          fill="#FF5A00"
        />
      </motion.svg>
    </div>
  )
}

// ── Idle 컨트롤러 ────────────────────────────────────────────────────────
// 애니메이션 완료까지 대기 시간 (spring settle 기준)
const TOGGLE_LOCK_MS = 420

function IdleController({ onStart, onStartDirect, onNaviSelect }: {
  onStart:       () => void
  onStartDirect: () => void
  onNaviSelect:  () => void
}) {
  const [open, setOpen] = useState(false)
  const busyRef         = useRef(false)

  const toggleOpen = () => {
    if (busyRef.current) return
    busyRef.current = true
    setOpen(prev => !prev)
    setTimeout(() => { busyRef.current = false }, TOGGLE_LOCK_MS)
  }

  const handleAction = (key: string) => {
    if (busyRef.current) return
    busyRef.current = true
    setOpen(false)
    setTimeout(() => { busyRef.current = false }, TOGGLE_LOCK_MS)
    if      (key === 'direct')      onStartDirect()
    else if (key === 'navi')        onStart()
    else                            onNaviSelect()
  }

  return (
    <>
      {/* ── 딤 배경 ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="fan-dim"
            className="fixed inset-0 z-[34]"
            style={{ background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(1.5px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={toggleOpen}
          />
        )}
      </AnimatePresence>

      {/* ── 탭바 동일 너비/위치 컨테이너 ── */}
      <div
        className="pointer-events-none fixed bottom-0 left-1/2 z-[35] -translate-x-1/2"
        style={{ width: 'calc(100% - 40px)', maxWidth: 360 }}
      >
        {/* ── 수직 팬 버튼 (▲와 동일 중심축, 아래→위) ── */}
        <AnimatePresence>
          {open && FAN_ITEMS.map((item, i) => (
            <motion.div
              key={item.key}
              className="pointer-events-auto absolute flex items-center gap-3"
              style={{
                bottom: FAN_BASE_BOTTOM + i * (FAN_BTN_SIZE + FAN_GAP),
                left:   FAN_LEFT,
                // transform 없음 — Framer Motion animate와 충돌 방지
              }}
              initial={{ y: 14, opacity: 0, scale: 0.72 }}
              animate={{ y: 0,  opacity: 1, scale: 1 }}
              exit={{   y: 8,  opacity: 0, scale: 0.62 }}
              transition={{
                type:      'spring',
                stiffness: 430,
                damping:   28,
                delay:     open
                  ? i * 0.055
                  : (FAN_ITEMS.length - 1 - i) * 0.04,
              }}
            >
              {/* 원형 버튼 */}
              <motion.button
                onClick={() => handleAction(item.key)}
                whileTap={{ scale: 0.87 }}
                className="flex shrink-0 items-center justify-center rounded-full"
                style={{ width: FAN_BTN_SIZE, height: FAN_BTN_SIZE, ...glass }}
              >
                <item.Icon
                  size={24}
                  strokeWidth={item.fill ? 0 : 1.7}
                  color={item.color}
                  fill={item.fill ? item.color : 'none'}
                />
              </motion.button>

              {/* 레이블 */}
              <span
                className="whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold"
                style={{
                  background:           'rgba(10,15,30,0.68)',
                  color:                'rgba(255,255,255,0.92)',
                  backdropFilter:       'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
              >
                {item.label}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* ── 터치 영역 (탭바 전체 + 삼각형 포함) ── */}
        <div
          className="pointer-events-auto absolute cursor-pointer"
          style={{
            bottom: TOUCH_BOTTOM,
            left:   TOUCH_LEFT,
            width:  TOUCH_W,
            height:    TOUCH_H,
          }}
          onClick={toggleOpen}
        >
          <Triangle open={open} />
        </div>
      </div>
    </>
  )
}

// ── Riding 컨트롤러 ──────────────────────────────────────────────────────
// 정지 버튼을 탭바 세로 중앙에 배치: TAB_BAR_BOTTOM(20) + TAB_BAR_H/2(42) = 62px
const STOP_BTN_CENTER_Y = TAB_BAR_BOTTOM + Math.floor(TAB_BAR_H / 2)   // 62px from screen bottom
const STOP_SIZE         = 48   // 정지 버튼 직경
// ●REC 배지: 정지 버튼 상단 + 2px 위 (탭바 안에 유지)
const REC_BADGE_BOTTOM  = STOP_BTN_CENTER_Y + STOP_SIZE / 2 + 2        // 88px from screen bottom


function RidingController({ onStop }: { onStop: () => void }) {
  const stopBtnBottom = STOP_BTN_CENTER_Y - TAB_BAR_BOTTOM - STOP_SIZE / 2  // 18px
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <>
    <div
      className="pointer-events-none fixed bottom-0 left-1/2 z-[35] -translate-x-1/2"
      style={{ width: 'calc(100% - 40px)', maxWidth: 360 }}
    >
      {/* 경로 기록중 배지 — 정지 버튼 원 바로 위 중앙 */}
      <div
        className="pointer-events-none absolute flex items-center gap-1 rounded-full px-3 py-1"
        style={{
          bottom:               REC_BADGE_BOTTOM,
          left:                 `calc(4px + (100% - 8px) / 10)`,
          transform:            'translateX(-50%)',
          background:           'rgba(255,255,255,0.82)',
          backdropFilter:       'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border:               '1px solid rgba(255,255,255,0.65)',
          whiteSpace:           'nowrap',
        }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full bg-red-500"
          style={{ animation: 'rec-dot-pulse 1.2s ease-in-out infinite' }}
        />
        <span className="text-[10px] font-semibold text-[#111827]">경로 기록중</span>
      </div>

      {/* 터치 영역: 기록 탭 전체 영역 */}
      <div
        className="pointer-events-auto absolute cursor-pointer"
        style={{
          bottom: TAB_BAR_BOTTOM,
          left:   TOUCH_LEFT,
          width:  TOUCH_W,
          height: TAB_BAR_H,
        }}
        onClick={() => setShowConfirm(true)}
      >
        {/* 정지 버튼 */}
        <div
          style={{
            position:  'absolute',
            bottom:    stopBtnBottom,
            left:      '50%',
            transform: 'translateX(-50%)',
            width:     STOP_SIZE,
            height:    STOP_SIZE,
          }}
        >
          <motion.div
            className="flex h-full w-full items-center justify-center rounded-full"
            style={{
              background: '#EF4444',
              boxShadow:  '0 0 0 4px rgba(239,68,68,0.18), 0 4px 20px rgba(239,68,68,0.50)',
            }}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          >
            <Square size={18} strokeWidth={0} fill="white" />
          </motion.div>
        </div>
      </div>
    </div>

    {/* ── 중지 확인 바텀시트 ── */}
    <div className={`fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${showConfirm ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={() => setShowConfirm(false)} />
    <div className={`fixed bottom-0 left-0 right-0 z-[201] transition-transform duration-500 ease-out ${showConfirm ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="mx-auto max-w-sm rounded-t-3xl bg-[#161B26]/98 px-6 pt-5 pb-12 backdrop-blur-xl">
        <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/15" />
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle size={13} strokeWidth={1.5} className="text-red-400" />
          <span className="text-[10px] font-light uppercase tracking-widest text-white/30">Stop Recording</span>
        </div>
        <p className="mb-1.5 text-[16px] font-bold text-white">기록을 중지할까요?</p>
        <p className="mb-6 text-[13px] font-light leading-relaxed text-white/45">
          중지하면 현재까지의 경로가<br />저장 목록으로 이동합니다.
        </p>
        <div className="flex gap-2.5">
          <button
            onClick={() => setShowConfirm(false)}
            className="flex flex-1 items-center justify-center rounded-2xl py-3.5 text-sm font-semibold text-white/60 active:opacity-70"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            계속 기록
          </button>
          <button
            onClick={() => { setShowConfirm(false); onStop() }}
            className="flex flex-[1.2] items-center justify-center gap-1.5 rounded-2xl py-3.5 text-sm font-bold text-white active:opacity-80"
            style={{ background: 'rgba(239,68,68,0.80)' }}
          >
            <Square size={13} strokeWidth={0} fill="white" />
            중지
          </button>
        </div>
      </div>
    </div>
    </>
  )
}

// ── 메인 컨트롤러 ────────────────────────────────────────────────────────
export default function ErgonomicController({
  status, duration, distance,
  onStart, onStartDirect, onNaviSelect, onStop, onGoToCourses,
}: Props) {
  if (status === 'finished') {
    return (
      <RideCompleteSheet
        duration={duration}
        distance={distance}
        onGoToCourses={onGoToCourses}
      />
    )
  }

  if (status === 'riding') {
    return <RidingController onStop={onStop} />
  }

  return (
    <IdleController
      onStart={onStart}
      onStartDirect={onStartDirect}
      onNaviSelect={onNaviSelect}
    />
  )
}
