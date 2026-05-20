// RideHUD.tsx — 주행 중 상단 HUD (시간 / 거리 / 평균속도)
// 주행 HUD UI 수정 시 이 파일만 건드리면 됩니다.

// ── 시간 포맷 (초 → 00:00 or 0:00:00) ──────────────────────────────────
export function fmtTime(s: number): string {
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// ── HUD 수치 한 칸 ────────────────────────────────────────────────────────
function HUDCol({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className="text-3xl font-bold leading-none text-[#FF5A00] md:text-5xl [@media(orientation:landscape)]:text-2xl"
        style={{
          fontFamily: "'Orbitron', sans-serif",
          textShadow: '0 0 10px rgba(255,90,0,0.5)',
        }}
      >
        {value}
      </span>
      <span
        className="whitespace-nowrap text-[9px] font-medium uppercase tracking-tighter text-white/50 [@media(orientation:landscape)]:text-[8px]"
        style={{ fontFamily: "'Urbanist', sans-serif" }}
      >
        {label}
      </span>
    </div>
  )
}

// ── 주행 중 HUD 전체 ──────────────────────────────────────────────────────
interface RideHUDProps {
  duration: number   // 초
  distance: number   // km
}

export default function RideHUD({ duration, distance }: RideHUDProps) {
  const avg = duration > 0 ? distance / (duration / 3600) : 0

  return (
    <div className="pointer-events-none fixed top-8 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-3 [@media(orientation:landscape)]:top-3">
      <div className="flex items-center justify-center gap-x-10 md:gap-x-16">
        <HUDCol value={fmtTime(duration)} label="주행시간" />
        <HUDCol value={distance.toFixed(2)}  label="주행거리" />
        <HUDCol value={avg.toFixed(0)}        label="평균속도" />
      </div>
      <p className="text-xs font-medium text-[#FF5A00] animate-pulse drop-shadow-[0_0_5px_rgba(255,90,0,0.6)]">
        • 경로를 기록중입니다
      </p>
    </div>
  )
}
