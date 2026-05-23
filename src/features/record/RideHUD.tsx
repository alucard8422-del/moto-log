// RideHUD.tsx — 주행 중 상단 HUD (3개 분리 카드)
// 아이콘만으로 기능 구분 | tabular-nums + minWidth 고정으로 레이아웃 흔들림 없음

import { Timer, Route, Gauge, MonitorSmartphone } from 'lucide-react'
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
  duration:      number   // 초
  distance:      number   // km
  speed:         number   // km/h — 실시간 속도 (RideRecordContext.currentSpeed)
  wakeLockActive?: boolean
}

export default function RideHUD({ duration, distance, speed, wakeLockActive }: RideHUDProps) {

  return (
    <div className="pointer-events-none fixed top-5 inset-x-0 z-50 flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        {/* 녹화 시간 */}
        <HUDCard
          icon={Timer}
          value={fmtTime(duration)}
          valW={52}
        />

        {/* 이동 거리 */}
        <HUDCard
          icon={Route}
          value={distance.toFixed(1)}
          unit="km"
          valW={36}
        />

        {/* 현재 속도 */}
        <HUDCard
          icon={Gauge}
          value={speed.toFixed(0)}
          unit="km/h"
          valW={28}
        />
      </div>

      {/* Wake Lock 상태 표시 */}
      {wakeLockActive !== undefined && (
        <div
          className="flex items-center gap-1 rounded-full px-2.5 py-1"
          style={{
            background: wakeLockActive
              ? 'rgba(34,197,94,0.15)'
              : 'rgba(239,68,68,0.15)',
            border: wakeLockActive
              ? '1px solid rgba(34,197,94,0.35)'
              : '1px solid rgba(239,68,68,0.35)',
          }}
        >
          <MonitorSmartphone
            size={10}
            strokeWidth={2}
            style={{ color: wakeLockActive ? '#22c55e' : '#ef4444' }}
          />
          <span
            className="text-[9px] font-semibold"
            style={{ color: wakeLockActive ? '#22c55e' : '#ef4444' }}
          >
            {wakeLockActive ? '화면 유지 중' : '화면 꺼짐 주의'}
          </span>
        </div>
      )}
    </div>
  )
}
