// routeUtils.ts — 내 경로 / 경로 작성 공통 유틸리티
// 타입·상수·포맷 함수·거리 계산·도시 매핑 수정 시 이 파일만 건드리면 됩니다.

import type { SavedCourse } from '../../lib/courseStorage'

export const KAKAO_APP_KEY = 'd2430786a3a92cc28ebf4f0a22993062'

// ── 타입 ─────────────────────────────────────────────────────────────────
export type LatLng = { lat: number; lng: number }
export type PlannerStage = 'DRAW' | 'CONFIRM'

// ── 거리 계산 ──────────────────────────────────────────────────────────────
export function haversine(a: LatLng, b: LatLng): number {
  const R    = 6371
  const dLat = (b.lat - a.lat) * (Math.PI / 180)
  const dLng = (b.lng - a.lng) * (Math.PI / 180)
  const x    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * (Math.PI / 180)) *
    Math.cos(b.lat * (Math.PI / 180)) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

export function totalDist(pts: LatLng[]): number {
  let d = 0
  for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i])
  return d
}

// ── 포맷 헬퍼 ─────────────────────────────────────────────────────────────
export function fmtDist(km: number) {
  return km < 1 ? `${(km * 1000).toFixed(0)}m` : `${km.toFixed(0)}km`
}
export function fmtDur(m: number) {
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`
}
export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
  })
}

// ── 좌표→도시명 근사 매핑 ──────────────────────────────────────────────────
export function approxCity(lat: number, lng: number): string {
  const MAP: [number, number, number, number, string][] = [
    [37.40,37.72,126.79,127.22,'서울'],[37.26,37.40,126.89,127.10,'수원'],
    [37.60,37.75,126.78,126.95,'고양'],[37.45,37.55,127.28,127.60,'양평'],
    [36.26,36.43,127.32,127.52,'대전'],[36.60,36.70,127.44,127.55,'청주'],
    [36.95,37.02,127.86,127.99,'충주'],[37.70,37.82,128.85,128.95,'강릉'],
    [37.85,37.97,128.74,128.95,'속초'],[36.77,36.88,127.09,127.21,'천안'],
    [36.45,36.60,127.10,127.25,'공주'],[36.47,36.55,127.38,127.45,'옥천'],
    [37.40,37.55,128.12,128.22,'횡성'],[37.40,37.55,127.85,128.00,'홍천'],
    [37.45,37.56,128.34,128.42,'평창'],[36.30,36.45,127.32,127.45,'세종'],
    [35.82,35.92,128.53,128.63,'대구'],[35.08,35.18,128.98,129.08,'부산'],
  ]
  for (const [a, b, c, d, name] of MAP) {
    if (lat >= a && lat <= b && lng >= c && lng <= d) return name
  }
  return '알 수 없음'
}

export function cityLabel(pts: SavedCourse['gpxPoints']): string {
  if (pts.length < 2) return '경로 없음'
  const s = approxCity(pts[0].lat, pts[0].lng)
  const e = approxCity(pts[pts.length - 1].lat, pts[pts.length - 1].lng)
  return s === e ? s : `${s} → ${e}`
}

// ── 샘플 데이터 (최초 1회 localStorage 시딩) ──────────────────────────────
import { YUSONG_SEOUL_POINTS, YUSONG_SEOUL_GPX_XML } from '../../data/sampleGpxData'

export const MOCK_SEED_KEY = 'moto:mock-seeded-v2'   // mock-gpx 코스 추가로 버전 올림

export const MOCK_COURSES: SavedCourse[] = [
  // ── GPX 포함 샘플 (영상 만들기 기능 시연용) ─────────────────────────────
  {
    id: 'mock-gpx', title: '유성구청 → 서울시청 라이딩',
    distanceKm: 198, durationMin: 195, isShared: false,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    gpxXml: YUSONG_SEOUL_GPX_XML,
    gpxPoints: YUSONG_SEOUL_POINTS,
    coverPhoto: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=70',
    diary: '일반국도만 타고 서울 입성! 경부고속도로 없이도 충분히 멋진 코스.',
  },
  {
    id: 'mock-1', title: '서울 → 강릉 동해안 투어',
    distanceKm: 248, durationMin: 195, isShared: false,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), gpxXml: '',
    coverPhoto: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=70',
    gpxPoints: [
      {lat:37.5665,lng:126.9780,timestamp:0},{lat:37.4890,lng:127.4920,timestamp:1},
      {lat:37.4210,lng:127.8870,timestamp:2},{lat:37.4920,lng:128.1570,timestamp:3},
      {lat:37.7520,lng:128.8760,timestamp:4},{lat:37.8813,lng:128.8980,timestamp:5},
    ],
  },
  {
    id: 'mock-2', title: '대전 → 서울 복귀 라이딩',
    distanceKm: 163, durationMin: 130, isShared: true,
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), gpxXml: '',
    coverPhoto: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=70',
    gpxPoints: [
      {lat:36.3504,lng:127.3845,timestamp:0},{lat:36.8065,lng:127.1520,timestamp:1},
      {lat:37.0630,lng:127.0590,timestamp:2},{lat:37.2636,lng:127.0286,timestamp:3},
      {lat:37.5665,lng:126.9780,timestamp:4},
    ],
  },
  {
    id: 'mock-3', title: '충주 → 대전 밤바리',
    distanceKm: 112, durationMin: 88, isShared: false,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), gpxXml: '',
    coverPhoto: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=70',
    gpxPoints: [
      {lat:36.9910,lng:127.9259,timestamp:0},{lat:36.8570,lng:127.6960,timestamp:1},
      {lat:36.6424,lng:127.4890,timestamp:2},{lat:36.4610,lng:127.4070,timestamp:3},
      {lat:36.3504,lng:127.3845,timestamp:4},
    ],
  },
]
