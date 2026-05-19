// types.ts
export type NavigationType = 'tmap' | 'kakao' | 'atlan'

export type RideStatus = 'idle' | 'riding' | 'finished'

export type GpsStatus = 'connected' | 'disconnected'

export type GeoErrorCode =
  | 'NOT_SUPPORTED'
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'

export interface Location {
  lat: number
  lng: number
  timestamp: number
  altitude?: number   // 고도 (m) — GPS 지원 시
  speed?: number      // 속도 (m/s) — GPS 지원 시
  heading?: number    // 방향 (0~360°) — GPS 지원 시
}

export type Coordinates = Location

export interface RideSession {
  id: string
  startTime: Date
  endTime: Date
  distance: number
  duration: number
  path: Location[]
}

export interface NaviOption {
  type: NavigationType
  label: string
  badge: string
  scheme: string
  fallback: string
}

export const NAVI_OPTIONS: NaviOption[] = [
  { type: 'tmap',  label: 'T map',    badge: 'T', scheme: 'tmap://',       fallback: 'https://tmap.life' },
  { type: 'kakao', label: '카카오내비', badge: 'K', scheme: 'kakaonavi://', fallback: 'https://map.kakao.com' },
  { type: 'atlan', label: '아틀란',    badge: 'A', scheme: 'atlan://',      fallback: 'https://atlan.com' },
]

export const NAVI_STORAGE_KEY = 'moto_navi_pref'
