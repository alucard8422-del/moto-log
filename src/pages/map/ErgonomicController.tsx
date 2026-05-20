// ErgonomicController.tsx — 지도 메뉴 하단 조작 컨트롤러
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Square, Flag, Timer, Route, Gauge, Compass, Settings, ChevronUp, Play } from 'lucide-react'
import { type RideStatus } from './types'

interface Props {
  status:        RideStatus
  duration:      number
  distance:      number
  onStart:       () => void       // 네비로 시작 → 카운트다운 팝업
  onStartDirect: () => void       // 그냥 시작 → GPS만 바로 기록
  onNaviSelect:  () => void       // 네비 선택 → 내비 앱 변경 시트
  onStop:        () => void
  onGoToCourses: () => void
}

// ── 부채꼴 버튼 설정 ──────────────────────────────────────────────────────
const R = 108   // 반지름 (px)

const FAN_ITEMS = [
  {
    key:    'navi',
    Icon:   Compass,
    label:  '네비로 시작',
    angle:  -58,                            // 11시 방향
    fill:   false,
    color:  '#0F172A',
  },
  {
    key:    'direct',
    Icon:   Play,
    label:  '그냥 시작',
    angle:  0,                              // 12시 방향
    fill:   true,
    color:  '#2DD4BF',
  },
  {
    key:    'navi-select',
    Icon:   Settings,
    label:  '네비 선택',
    angle:  58,                             // 1시 방향
    fill:   false,
    color:  '#475569',
  },
]

function fanXY(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: r * Math.sin(rad), y: -(r * Math.cos(rad)) }  // y: 음수 = 위
}

// ── 유리 스타일 공통 ─────────────────────────────────────────────────────
const glass = {
  background:           'rgba(255,255,255,0.88)',
  backdropFilter:       'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border:               '1px solid rgba(255,255,255,0.55)',
  boxShadow:            '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.06)',
}

// ── Idle: 토글 + 부채꼴 메뉴 ─────────────────────────────────────────────
function IdleController({ onStart, onStartDirect, onNaviSelect }: {
  onStart:       () => void
  onStartDirect: () => void
  onNaviSelect:  () => void
}) {
  const [open, setOpen] = useState(false)

  const handleAction = (key: string) => {
    setOpen(false)
    if (key === 'navi')        onStart()
    else if (key === 'direct') onStartDirect()
    else                       onNaviSelect()
  }

  // 토글 버튼 중심 위치 (컨테이너 하단 기준)
  const TOGGLE_H      = 56   // 토글 버튼 직경
  const TOGGLE_BOTTOM = 28   // 컨테이너 하단에서 토글 버튼 bottom 값
  const CENTER_Y      = TOGGLE_BOTTOM + TOGGLE_H / 2   // 토글 중심 y (하단 기준)

  const BTN_H = 62   // 팬 버튼 직경

  return (
    <>
      {/* 딤 배경 — 탭 외부 터치 시 닫기 */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="fan-backdrop"
            className="fixed inset-0 z-[34]"
            style={{ background: 'rgba(0,0,0,0.18)', backdropFilter: 'blur(1px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* 컨트롤러 — 화면 하단 고정 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[35]">
        <div className="relative mx-auto" style={{ maxWidth: 400, height: 230 }}>

          {/* ── 부채꼴 팬 버튼 ── */}
          <AnimatePresence>
            {open && FAN_ITEMS.map((item, i) => {
              const { x, y } = fanXY(item.angle, R)
              return (
                <motion.div
                  key={item.key}
                  className="pointer-events-auto absolute flex flex-col items-center gap-1.5"
                  style={{
                    bottom: CENTER_Y - BTN_H / 2,
                    left:   `calc(50% - ${BTN_H / 2}px)`,
                  }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.55 }}
                  animate={{ x, y, opacity: 1, scale: 1 }}
                  exit={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                  transition={{
                    type:      'spring',
                    stiffness: 380,
                    damping:   26,
                    delay:     open ? i * 0.055 : (FAN_ITEMS.length - 1 - i) * 0.04,
                  }}
                >
                  {/* 원형 버튼 */}
                  <motion.button
                    onClick={() => handleAction(item.key)}
                    whileTap={{ scale: 0.91 }}
                    className="flex items-center justify-center rounded-full"
                    style={{ width: BTN_H, height: BTN_H, ...glass }}
                  >
                    <item.Icon
                      size={26}
                      strokeWidth={item.fill ? 0 : 1.7}
                      color={item.color}
                      fill={item.fill ? item.color : 'none'}
                    />
                  </motion.button>

                  {/* 레이블 */}
                  <span
                    className="whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-tight"
                    style={{
                      background:           'rgba(10,15,30,0.62)',
                      color:                'rgba(255,255,255,0.93)',
                      backdropFilter:       'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                    }}
                  >
                    {item.label}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* ── 중앙 토글 버튼 (^) ── */}
          <motion.button
            className="pointer-events-auto absolute flex items-center justify-center rounded-full"
            style={{
              width:  TOGGLE_H,
              height: TOGGLE_H,
              bottom: TOGGLE_BOTTOM,
              left:   '50%',
              x:      '-50%',
              ...glass,
            }}
            whileTap={{ scale: 0.91 }}
            onClick={() => setOpen(prev => !prev)}
          >
            <motion.div
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            >
              <ChevronUp size={22} strokeWidth={2.2} color="#1E293B" />
            </motion.div>
          </motion.button>

        </div>
      </div>
    </>
  )
}

// ── 주행 완료 시트 ────────────────────────────────────────────────────────
function fmt(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function RideCompleteSheet({
  duration, distance, onGoToCourses,
}: { duration: number; distance: number; onGoToCourses: () => void }) {
  const [open, setOpen] = useState(false)
  useState(() => { setTimeout(() => setOpen(true), 16) })

  const avg = duration > 0 ? distance / (duration / 3600) : 0

  const rows = [
    { icon: <Timer size={14} strokeWidth={1.5} className="text-teal-400" />, label: '주행 시간', value: fmt(duration) },
    { icon: <Route size={14} strokeWidth={1.5} className="text-teal-400" />, label: '주행 거리', value: `${distance.toFixed(2)} km` },
    { icon: <Gauge size={14} strokeWidth={1.5} className="text-teal-400" />, label: '평균 속도', value: `${avg.toFixed(0)} km/h` },
  ]

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="mx-auto max-w-sm rounded-t-3xl bg-[#161B26]/98 px-6 pt-5 pb-12 backdrop-blur-xl">
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/15" />
          <div className="mb-6 flex items-center gap-2">
            <Flag size={13} strokeWidth={1.5} className="text-teal-400" />
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
                  <span className="text-sm font-bold text-teal-400">{value}</span>
                </div>
                {i < rows.length - 1 && <div className="mt-4 h-px bg-white/5" />}
              </div>
            ))}
          </div>
          <button
            onClick={onGoToCourses}
            className="w-full rounded-3xl bg-teal-400 py-4 text-sm font-bold text-slate-950 transition-opacity active:opacity-80"
          >
            내 경로에 저장하기
          </button>
        </div>
      </div>
    </>
  )
}

// ── 메인 컨트롤러 ─────────────────────────────────────────────────────────
export default function ErgonomicController({
  status, duration, distance,
  onStart, onStartDirect, onNaviSelect, onStop, onGoToCourses,
}: Props) {

  if (status === 'finished') {
    return <RideCompleteSheet duration={duration} distance={distance} onGoToCourses={onGoToCourses} />
  }

  if (status === 'riding') {
    return (
      <div className="pointer-events-none absolute inset-0 z-20">
        <button
          onClick={onStop}
          className="pointer-events-auto absolute bottom-24 left-1/2 -translate-x-1/2 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 shadow-[0_0_24px_4px_rgba(244,63,94,0.45)] active:opacity-80"
        >
          <Square size={22} strokeWidth={0} fill="white" />
        </button>
      </div>
    )
  }

  // idle
  return (
    <IdleController
      onStart={onStart}
      onStartDirect={onStartDirect}
      onNaviSelect={onNaviSelect}
    />
  )
}
