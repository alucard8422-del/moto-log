// ViewSelector.tsx — ⑤ 5가지 촬영 뷰 선택 화면 (DJI / Insta360 스타일)

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { VIEW_OPTIONS, type ViewType, type ViewOption } from './videoTypes'

interface Props {
  courseTitle: string
  distKm:      number
  onSelect:    (view: ViewOption) => void
}

export default function ViewSelector({ courseTitle, distKm, onSelect }: Props) {
  const [hovered, setHovered] = useState<ViewType | null>(null)

  return (
    <div className="flex h-full flex-col">

      {/* 헤더 */}
      <div className="px-5 pb-4 pt-6">
        <p className="text-[11px] font-light tracking-widest text-white/30 uppercase mb-1">
          촬영 스타일 선택
        </p>
        <h2 className="text-xl font-bold text-white leading-tight">{courseTitle}</h2>
        <p className="mt-0.5 text-sm font-light text-white/40">{distKm.toFixed(0)} km 경로</p>
      </div>

      {/* 구분선 */}
      <div className="mx-5 h-px bg-white/5" />

      {/* 뷰 카드 목록 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {VIEW_OPTIONS.map((v, i) => (
          <motion.button
            key={v.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07, type: 'spring', stiffness: 320, damping: 28 }}
            onHoverStart={() => setHovered(v.id)}
            onHoverEnd={() => setHovered(null)}
            onClick={() => onSelect(v)}
            className={`relative flex items-center gap-4 rounded-2xl border p-4 text-left transition-colors duration-200 active:scale-[0.98] ${
              hovered === v.id
                ? 'border-violet-400/40 bg-violet-500/15'
                : 'border-white/8 bg-white/[0.04]'
            }`}
          >
            {/* 이모지 아이콘 */}
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-3xl transition-colors ${
              hovered === v.id ? 'bg-violet-500/20' : 'bg-white/5'
            }`}>
              {v.emoji}
            </div>

            {/* 텍스트 */}
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-white">{v.name}</p>
              <p className="mt-0.5 text-[12px] font-light text-white/45 leading-snug">{v.desc}</p>
              {/* 카메라 스펙 */}
              <div className="mt-2 flex gap-2">
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] text-white/30">
                  pitch {v.pitch}°
                </span>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] text-white/30">
                  zoom {v.zoom}
                </span>
              </div>
            </div>

            {/* 화살표 */}
            <ChevronRight
              size={18} strokeWidth={1.5}
              className={`shrink-0 transition-colors ${hovered === v.id ? 'text-violet-400' : 'text-white/20'}`}
            />

            {/* 호버 글로우 */}
            <AnimatePresence>
              {hovered === v.id && (
                <motion.div
                  className="pointer-events-none absolute inset-0 rounded-2xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ boxShadow: 'inset 0 0 0 1px rgba(167,139,250,0.25)' }}
                />
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      {/* 하단 여백 */}
      <div className="h-6" />
    </div>
  )
}
