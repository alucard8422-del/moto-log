// plannerUtils.ts — 경로 작성 페이지 공유 타입 · 유틸
// UI 컴포넌트들이 공통으로 참조하는 타입과 순수 함수

// ── 타입 ─────────────────────────────────────────────────────────────────────
export interface DeleteTarget {
  idx:     number   // points 배열 내 인덱스
  screenX: number   // 말풍선을 띄울 화면 X (clientX)
  screenY: number   // 말풍선을 띄울 화면 Y (clientY)
}

// ── 마커 이미지 생성 (캔버스 DataURL) ─────────────────────────────────────────
export function makeMarkerDataUrl(label: string, bg: string, fg: string): string {
  const S   = 32
  const c   = document.createElement('canvas')
  c.width   = S
  c.height  = S
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, S, S)
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2)
  ctx.fillStyle   = bg
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth   = 2.5
  ctx.stroke()
  ctx.fillStyle     = fg
  ctx.font          = `bold ${Math.round(S * 0.34)}px system-ui,sans-serif`
  ctx.textAlign     = 'center'
  ctx.textBaseline  = 'middle'
  ctx.fillText(label, S / 2, S / 2 + 0.5)
  return c.toDataURL()
}
