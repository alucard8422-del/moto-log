// ErgonomicController.tsx — 기록 탭 위 수직 팬 메뉴 + 주행 정지 버튼
// - Idle  : 기록 탭 위 오렌지 화살표 → 위로 3개 버튼 순차 호출
// - Riding: 화살표 자리에 정지 버튼 표시
// - Finished: 주행 완료 시트

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Square, Flag, Timer, Route, Gauge, Compass, Settings, ChevronUp, Play } from 'lucide-react'
import { type RideStatus } from './types'

interface Props {
  status:        RideStatus
  duration:      number
  distance:      number
  onStart:       () => void       // 내비로 시작 → 카운트다운
  onStartDirect: () => void       // 바로 시작 → GPS 바로 기록
  onNaviSelect:  () => void       // 네비 선택 시트
  onStop:        () => void
  onGoToCourses: () => void
}

// ── 수직 팬 아이템 (아래 → 위 순서로 정의) ───────────────────────────────
const FAN_ITEMS = [
  { key: 'direct',      Icon: Play,     label: '바로 시작',   fill: true,  color: '#FF5A00' },
  { key: 'navi',        Icon: Compass,  label: '내비로 시작', fill: false, color: '#0F172A' },
  { key: 'navi-select', Icon: Settings, label: '네비 선택',   fill: false, color: '#475569' },
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
const TAB_BAR_BOTTOM   = 20          // bottom-5 (px) — 탭바 하단
const TAB_BAR_H        = 84          // 탭바 높이
const ARROW_SIZE       = 48          // 오렌지 서클 직경
const TOUCH_W          = 76          // 터치 영역 너비 (장갑 고려)
const TOUCH_H          = TAB_BAR_H + ARROW_SIZE + 6   // 138px — 기록탭+화살표 전체
// 오렌지 서클 상단 edge = screen bottom 에서 (TAB_BAR_BOTTOM + TOUCH_H) = 158px
const ARROW_CIRCLE_TOP = TAB_BAR_BOTTOM + TOUCH_H      // 158px from screen bottom
const FAN_BTN_SIZE     = 58
const FAN_GAP          = 12
const FAN_BASE_BOTTOM  = ARROW_CIRCLE_TOP + 10         // 168px — 첫 팬 버튼 하단

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
    { icon: <Timer size={14} strokeWidth={1.5} className="text-[#FF5A00]" />, label: '주행 시간', value: fmt(duration) },
    { icon: <Route size={14} strokeWidth={1.5} className="text-[#FF5A00]" />, label: '주행 거리', value: `${distance.toFixed(2)} km` },
    { icon: <Gauge size={14} strokeWidth={1.5} className="text-[#FF5A00]" />, label: '평균 속도', value: `${avg.toFixed(0)} km/h` },
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

// ── Idle 컨트롤러 ────────────────────────────────────────────────────────
function IdleController({ onStart, onStartDirect, onNaviSelect }: {
  onStart:       () => void
  onStartDirect: () => void
  onNaviSelect:  () => void
}) {
  const [open, setOpen] = useState(false)

  const handleAction = (key: string) => {
    setOpen(false)
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
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── 탭바 동일 너비/위치 컨테이너 ── */}
      <div
        className="pointer-events-none fixed bottom-0 left-1/2 z-[35] -translate-x-1/2"
        style={{ width: 'calc(100% - 40px)', maxWidth: 360 }}
      >
        {/* ── 수직 팬 버튼 (아래→위 순서로 i=0이 가장 아래) ── */}
        <AnimatePresence>
          {open && FAN_ITEMS.map((item, i) => (
            <motion.div
              key={item.key}
              className="pointer-events-auto absolute flex items-center gap-3"
              style={{
                bottom:    FAN_BASE_BOTTOM + i * (FAN_BTN_SIZE + FAN_GAP),
                left:      '10%',
                transform: 'translateX(-50%)',
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

        {/* ── 화살표 토글 버튼 (터치 영역: 기록 탭 전체 + 화살표) ── */}
        <div
          className="pointer-events-auto absolute"
          style={{
            bottom:    TAB_BAR_BOTTOM,
            left:      '10%',
            transform: 'translateX(-50%)',
            width:     TOUCH_W,
            height:    TOUCH_H,
            cursor:    'pointer',
          }}
          onClick={() => setOpen(prev => !prev)}
        >
          {/* 오렌지 서클 — 터치 영역 최상단 */}
          <div
            className="absolute left-1/2 flex items-center justify-center rounded-full"
            style={{
              top:       0,
              transform: 'translateX(-50%)',
              width:     ARROW_SIZE,
              height:    ARROW_SIZE,
              background: '#FF5A00',
              boxShadow: open
                ? '0 0 0 10px rgba(255,90,0,0.14), 0 4px 20px rgba(255,90,0,0.55)'
                : '0 4px 16px rgba(255,90,0,0.42), 0 0 0 3px rgba(255,90,0,0.10)',
              transition: 'box-shadow 0.2s',
            }}
          >
            <motion.div
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            >
              <ChevronUp size={22} strokeWidth={2.5} color="white" />
            </motion.div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Riding 컨트롤러 ──────────────────────────────────────────────────────
function RidingController({ onStop }: { onStop: () => void }) {
  return (
    <div
      className="pointer-events-none fixed bottom-0 left-1/2 z-[35] -translate-x-1/2"
      style={{ width: 'calc(100% - 40px)', maxWidth: 360 }}
    >
      {/* 정지 버튼 — 화살표와 동일 위치/터치 영역 */}
      <div
        className="pointer-events-auto absolute"
        style={{
          bottom:    TAB_BAR_BOTTOM,
          left:      '10%',
          transform: 'translateX(-50%)',
          width:     TOUCH_W,
          height:    TOUCH_H,
          cursor:    'pointer',
          display:   'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
        onClick={onStop}
      >
        <motion.div
          className="flex items-center justify-center rounded-full"
          style={{
            width:     ARROW_SIZE,
            height:    ARROW_SIZE,
            background: '#EF4444',
            boxShadow: '0 0 0 3px rgba(239,68,68,0.15), 0 4px 20px rgba(239,68,68,0.50)',
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        >
          <Square size={18} strokeWidth={0} fill="white" />
        </motion.div>
      </div>
    </div>
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
