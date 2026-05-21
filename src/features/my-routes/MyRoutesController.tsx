// MyRoutesController.tsx — 내 경로 탭 위 ▲ 삼각형 + 수직 팬 메뉴
// ErgonomicController(기록 탭, index 0)와 동일 원리 — index 1 (내 경로) 기준 정렬

import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PenLine } from 'lucide-react'

// ── 팬 아이템 ─────────────────────────────────────────────────────────────
const FAN_ITEMS = [
  { key: 'route-planner', Icon: PenLine, label: '경로작성', path: '/route-planner' },
] as const

// ── 글래스 스타일 ─────────────────────────────────────────────────────────
const glass = {
  background:           'rgba(255,255,255,0.92)',
  backdropFilter:       'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border:               '1px solid rgba(255,255,255,0.65)',
  boxShadow:            '0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
} as const

// ── 레이아웃 상수 (ErgonomicController와 동일 기준) ─────────────────────
const TAB_BAR_BOTTOM  = 20
const TAB_BAR_H       = 84
const TAB_BAR_TOP     = TAB_BAR_BOTTOM + TAB_BAR_H   // 104px

const TRI_W           = 16
const TRI_H           = 12
const TRI_BASE_BOTTOM = TAB_BAR_TOP - TRI_H / 2      // 98px
const TRI_TIP_BOTTOM  = TAB_BAR_TOP + TRI_H / 2      // 110px

const TOUCH_W         = 72
const TOUCH_BOTTOM    = TAB_BAR_BOTTOM                // 20px
const TOUCH_H         = TRI_TIP_BOTTOM + 12 - TOUCH_BOTTOM  // 102px

const FAN_BTN_SIZE    = 58
const FAN_GAP         = 12
const FAN_BASE_BOTTOM = TRI_TIP_BOTTOM + 10           // 120px

const TRI_BOTTOM_IN_TOUCH = TRI_BASE_BOTTOM - TOUCH_BOTTOM  // 78px

// ── "내 경로" 탭 center (index 1) ───────────────────────────────────────
// 탭바: justify-around + px-1(4px씩) → 두 번째 탭 center = 4px + (100%-8px)*3/10
const FAN_LEFT   = `calc(4px + (100% - 8px) * 3 / 10 - ${FAN_BTN_SIZE / 2}px)`
const TOUCH_LEFT = `calc(4px + (100% - 8px) * 3 / 10 - ${TOUCH_W / 2}px)`

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
          display:         'block',
          filter:          open
            ? 'drop-shadow(0 0 6px rgba(255,90,0,0.55))'
            : 'drop-shadow(0 2px 6px rgba(255,90,0,0.40))',
          transformOrigin: `${TRI_W / 2}px ${TRI_H / 2}px`,
        }}
      >
        <polygon
          points={`${TRI_W / 2},2 ${TRI_W - 2},${TRI_H - 2} 2,${TRI_H - 2}`}
          fill="#FF5A00"
        />
      </motion.svg>
    </div>
  )
}

// 애니메이션 완료까지 대기 시간
const TOGGLE_LOCK_MS = 420

// ── 메인 컨트롤러 ────────────────────────────────────────────────────────
export default function MyRoutesController() {
  const navigate = useNavigate()
  const [open, setOpen]   = useState(false)
  const busyRef           = useRef(false)

  const toggleOpen = () => {
    if (busyRef.current) return
    busyRef.current = true
    setOpen(prev => !prev)
    setTimeout(() => { busyRef.current = false }, TOGGLE_LOCK_MS)
  }

  const handleAction = (path: string) => {
    if (busyRef.current) return
    busyRef.current = true
    setOpen(false)
    setTimeout(() => { busyRef.current = false }, TOGGLE_LOCK_MS)
    navigate(path)
  }

  return (
    <>
      {/* ── 딤 배경 ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="myroutes-fan-dim"
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
        {/* ── 수직 팬 버튼 ── */}
        <AnimatePresence>
          {open && FAN_ITEMS.map((item, i) => (
            <motion.div
              key={item.key}
              className="pointer-events-auto absolute flex items-center gap-3"
              style={{
                bottom: FAN_BASE_BOTTOM + i * (FAN_BTN_SIZE + FAN_GAP),
                left:   FAN_LEFT,
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
                onClick={() => handleAction(item.path)}
                whileTap={{ scale: 0.87 }}
                className="flex shrink-0 items-center justify-center rounded-full"
                style={{ width: FAN_BTN_SIZE, height: FAN_BTN_SIZE, ...glass }}
              >
                <item.Icon size={24} strokeWidth={1.7} color="#FF5A00" />
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

        {/* ── 터치 영역 (탭바 + 삼각형 포함) ── */}
        <div
          className="pointer-events-auto absolute cursor-pointer"
          style={{
            bottom: TOUCH_BOTTOM,
            left:   TOUCH_LEFT,
            width:  TOUCH_W,
            height: TOUCH_H,
          }}
          onClick={toggleOpen}
        >
          <Triangle open={open} />
        </div>
      </div>
    </>
  )
}
