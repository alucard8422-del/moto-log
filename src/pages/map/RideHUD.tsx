// RideHUD.tsx — 주행 중 상단 HUD (3개 분리 카드)
// 아이콘만으로 기능 구분 | tabular-nums + minWidth 고정으로 레이아웃 흔들림 없음

import { Timer, Route, Gauge } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ── 시간 포맷 (초 → MM:SS or H:MM:SS) ────────────────────────────────────
export function fmtTime(s: number): string {
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// ── 카드 공통 ─────────────────────────────────────────────────────────────
interface CardProps {
  icon:    LucideIcon
  value:   string
  unit?:   string
  valW:    number   // 숫자 칸 고정 너비(px) — 레이아웃 흔들림 방지
}

function HUDCard({ icon: Icon, value, unit, valW }: CardProps) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-2xl px-3 py-2.5"
      style={{
        background:           'rgba(255,255,255,0.94)',
        backdropFilter:       'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border:               '1px solid rgba(255,90,0,0.18)',
        boxShadow:            '0 2px 12px rgba(0,0,0,0.07), 0 0 0 0.5px rgba(255,90,0,0.08)',
      }}
    >
      {/* 기능 아이콘 */}
      <Icon
        size={14}
        strokeWidth={2.2}
        style={{ color: '#FF5A00', flexShrink: 0 }}
      />

      {/* 숫자 — tabular-nums + 고정폭으로 레이아웃 고정 */}
      <span
        className="tabular-nums text-[13px] font-bold leading-none text-[#111827]"
        style={{ minWidth: valW, display: 'inline-block' }}
      >
        {value}
      </span>

      {/* 단위 */}
      {unit && (
        <span className="text-[10px] font-medium leading-none text-[#9CA3AF]">
          {unit}
        </span>
      )}
    </div>
  )
}

// ── 메인 HUD ─────────────────────────────────────────────────────────────
interface RideHUDProps {
  duration: number   // 초
  distance: number   // km
}

export default function RideHUD({ duration, distance }: RideHUDProps) {
  const speed = duration > 0 ? distance / (duration / 3600) : 0

  return (
    <div className="pointer-events-none fixed top-5 inset-x-0 z-50 flex justify-center">
      <div className="flex items-center gap-2">
        {/* 녹화 시간 */}
        <HUDCard
          icon={Timer}
          value={fmtTime(duration)}
          valW={52}   // "0:00:00" 최대 7자 커버
        />

        {/* 이동 거리 */}
        <HUDCard
          icon={Route}
          value={distance.toFixed(1)}
          unit="km"
          valW={36}   // "999.9" 5자 커버
        />

        {/* 현재 속도 */}
        <HUDCard
          icon={Gauge}
          value={speed.toFixed(0)}
          unit="km/h"
          valW={28}   // "999" 3자 커버
        />
      </div>
    </div>
  )
}
