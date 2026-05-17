// mapConfig.ts — 앱 전체 Leaflet 지도 공통 설정
import type { LatLngBoundsExpression } from 'leaflet'

// 대한민국 영토 바운딩 박스 (SW → NE)
export const KOREA_BOUNDS: LatLngBoundsExpression = [
  [33.0, 124.0],  // 남서단 (제주 남쪽 + 서해 여유)
  [39.0, 132.0],  // 북동단 (두만강 + 독도 포함)
]

// 대한민국 중심 좌표
export const KOREA_CENTER: [number, number] = [36.5, 127.8]

// 전도가 한눈에 보이는 최소 줌 레벨
export const KOREA_MIN_ZOOM = 6

// 다크 타일 URL (CartoDB Dark Matter)
export const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
export const DARK_TILE_SUBDOMAINS = 'abcd'
export const DARK_TILE_MAX_ZOOM = 19
