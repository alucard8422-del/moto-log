// EncodingPanel.tsx — 인코딩 진행 UI (DJI / Insta360 스타일)
// 맵 애니메이션을 배경에 그대로 보여주고, 반투명 HUD를 오버레이

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import MapboxRecorder from './MapboxRecorder'
import type { ViewOption } from './videoTypes'
import type { GpxPoint } from '../../constants/sampleGpxData'

interface Props {
  points:     GpxPoint[] | Array<{ lat: number; lng: number; timestamp: number }>
  view:       ViewOption
  onComplete: (blob: Blob) => void
}

const TOTAL_SEC = 30

function CircleProgress({ pct }: { pct: number }) {
  const r    = 52
  const circ = 2 * Math.PI * r
  const dash = circ * (1 - pct / 100)
  return (
    <svg width="128" height="128" className="rotate-[-90deg]">
      <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
      <circle
        cx="64" cy="64" r={r}
        fill="none"
        stroke="url(#pg)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={dash}
        style={{ transition: 'stroke-dashoffset 0.25s linear' }}
      />
      <defs>
        <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#c4b5fd" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function EncodingPanel({ points, view, onComplete }: Props) {
  const [pct,   setPct]   = useState(0)
  const [frame, setFrame] = useState(0)
  const [eta,   setEta]   = useState(TOTAL_SEC)
  const startRef = useRef(Date.now())
  const isDone   = pct >= 100

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000
      setFrame(Math.round(elapsed * 30))
      setEta(Math.max(0, Math.round(TOTAL_SEC - elapsed)))
    }, 100)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">

      {/* ── 맵 애니메이션 배경 (실제 녹화 중) ── */}
      <div className="absolute inset-0">
        <MapboxRecorder
          points={points}
          view={view}
          onProgress={setPct}
          onComplete={onComplete}
        />
      </div>

      {/* ── 반투명 오버레이 HUD ── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">

        {/* HUD 카드 */}
        <motion.div
          className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-black/55 px-8 py-6 backdrop-blur-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          {/* 상태 레이블 */}
          <p className={`text-[10px] font-light tracking-widest uppercase ${isDone ? 'text-teal-400/80' : 'text-white/30'}`}>
            {isDone ? '인코딩 완료' : '영상 인코딩 중'}
          </p>

          {/* 원형 게이지 */}
          <div className="relative flex items-center justify-center">
            <CircleProgress pct={pct} />
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black tabular-nums text-white">
                {String(pct).padStart(2, '0')}
                <span className="text-base font-light text-white/40">%</span>
              </span>
              {!isDone && (
                <span className="text-[9px] font-light text-white/25">{eta}s 남음</span>
              )}
            </div>
          </div>

          {/* 뷰 이름 */}
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="text-base">{view.emoji}</span>
            <span className="text-xs font-semibold text-white/60">{view.name}</span>
          </div>

          {/* 기술 스펙 */}
          <div className="flex gap-4">
            {[
              { l: 'CODEC', v: 'VP9' },
              { l: 'FPS',   v: '30' },
              { l: 'FRAME', v: String(frame).padStart(4, '0') },
              { l: 'KBPS',  v: '5000' },
            ].map(item => (
              <div key={item.l} className="flex flex-col items-center gap-0.5">
                <span className="text-[7px] font-light tracking-widest text-white/20 uppercase">{item.l}</span>
                <span className="text-[10px] font-bold tabular-nums text-white/45">{item.v}</span>
              </div>
            ))}
          </div>

          {/* 선형 바 */}
          <div className="w-40 overflow-hidden rounded-full bg-white/5 h-[2px]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-300"
              style={{ width: `${pct}%`, transition: 'width 0.25s linear' }}
            />
          </div>
        </motion.div>

        {/* REC 표시 */}
        {!isDone && (
          <motion.div
            className="absolute top-4 right-4 flex items-center gap-1.5"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-[10px] font-bold tracking-widest text-red-400">REC</span>
          </motion.div>
        )}
      </div>
    </div>
  )
}
