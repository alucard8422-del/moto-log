// bikeUtils.ts — 차고 바이크 ↔ 맵박스 아이콘 연동 유틸리티
// 차고에서 업그레이드할 때마다 맵 위 바이크 색상이 자동으로 바뀝니다.

import { BIKE_LINEUP, OWNED_BIKES_KEY } from '../data/VehicleShopData'

// ── 현재 차고 바이크 조회 ────────────────────────────────────────────────────
export function getCurrentBike() {
  try {
    const owned: number[] = JSON.parse(localStorage.getItem(OWNED_BIKES_KEY) ?? '[50]')
    const maxCc = Math.max(...owned)
    return BIKE_LINEUP.find(b => b.cc === maxCc) ?? BIKE_LINEUP[0]
  } catch {
    return BIKE_LINEUP[0]
  }
}

// ── 바이크 cc → 맵 아이콘 색상 ──────────────────────────────────────────────
export function getCurrentBikeColor(): string {
  return getCurrentBike().mapColor
}

// ── SVG 생성 (color = 차체 메인 컬러) ────────────────────────────────────────
// viewBox: 32×56 (위아래로 긴 세로형 — 진행 방향이 위쪽)
export function makeBikeSvg(color: string): string {
  // 어두운 보조색 (채도 낮추고 밝기 줄임)
  const shadow = blendHex(color, '#0f172a', 0.4)
  const dark   = blendHex(color, '#0f172a', 0.65)

  return `<svg viewBox="0 0 32 56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- 앞바퀴 -->
  <rect x="10" y="0"  width="12" height="18" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <rect x="12" y="2"  width="8"  height="14" rx="4" fill="#334155"/>
  <!-- 앞 서스펜션 -->
  <rect x="12" y="16" width="3.5" height="7" rx="1.5" fill="#475569"/>
  <rect x="16.5" y="16" width="3.5" height="7" rx="1.5" fill="#475569"/>
  <!-- 핸들바 -->
  <rect x="4"  y="20" width="24" height="3.5" rx="1.75" fill="#475569"/>
  <!-- 차체 메인 -->
  <rect x="10" y="21" width="12" height="14" rx="4" fill="${color}"/>
  <rect x="11" y="22" width="10" height="8"  rx="3" fill="${shadow}"/>
  <rect x="11" y="30" width="10" height="6"  rx="2" fill="${dark}"/>
  <!-- 시트 -->
  <rect x="10" y="34" width="12" height="10" rx="3" fill="${blendHex(color, '#0f172a', 0.75)}"/>
  <!-- 사이드 패널 -->
  <rect x="4"  y="28" width="5"  height="9"  rx="2.5" fill="#64748b" opacity="0.85"/>
  <rect x="23" y="28" width="5"  height="9"  rx="2.5" fill="#64748b" opacity="0.85"/>
  <!-- 스윙암 -->
  <rect x="11" y="42" width="10" height="4"  rx="2" fill="${dark}"/>
  <!-- 뒷바퀴 -->
  <rect x="10" y="44" width="12" height="18" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <rect x="12" y="46" width="8"  height="14" rx="4" fill="#334155"/>
  <!-- 헤드라이트 글로우 -->
  <ellipse cx="16" cy="4" rx="4"   ry="2.5" fill="white" opacity="0.9"/>
  <ellipse cx="16" cy="3" rx="2.5" ry="1.5" fill="white"/>
  <ellipse cx="16" cy="3" rx="7"   ry="4"   fill="white" opacity="0.18"/>
</svg>`
}

// ── 차고 현재 바이크 기준 SVG ────────────────────────────────────────────────
export function getCurrentBikeSvg(): string {
  return makeBikeSvg(getCurrentBikeColor())
}

// ── Promise<HTMLImageElement> 로더 ──────────────────────────────────────────
export function loadBikeImage(svg?: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(64, 112)
    img.onload  = () => resolve(img)
    img.onerror = reject
    img.src = 'data:image/svg+xml,' + encodeURIComponent(svg ?? getCurrentBikeSvg())
  })
}

// ── 헥스 색상 블렌드 헬퍼 (amount=0 → a, amount=1 → b) ─────────────────────
function blendHex(a: string, b: string, amount: number): string {
  const ar = parseInt(a.slice(1, 3), 16)
  const ag = parseInt(a.slice(3, 5), 16)
  const ab = parseInt(a.slice(5, 7), 16)
  const br = parseInt(b.slice(1, 3), 16)
  const bg = parseInt(b.slice(3, 5), 16)
  const bb = parseInt(b.slice(5, 7), 16)
  const r = Math.round(ar + (br - ar) * amount)
  const g = Math.round(ag + (bg - ag) * amount)
  const bv = Math.round(ab + (bb - ab) * amount)
  return '#' + [r, g, bv].map(v => v.toString(16).padStart(2, '0')).join('')
}
