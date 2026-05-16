// types.ts
export type NavigationType = 'tmap' | 'kakao' | 'atlan'

export type RideStatus = 'idle' | 'riding' | 'finished'

export type GeoErrorCode =
  | 'NOT_SUPPORTED'
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'

export interface Location {
  lat: number
  lng: number
  timestamp: number
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
  description: string
  scheme: string
  fallback: string
}

export const NAVI_OPTIONS: NaviOption[] = [
  {
    type: 'tmap',
    label: 'T map',
    badge: 'T',
    description: 'SK텔레콤 · 음성 안내 최강',
    scheme: 'tmap://',
    fallback: 'https://tmap.life',
  },
  {
    type: 'kakao',
    label: '카카오내비',
    badge: 'K',
    description: '카카오 · 실시간 교통 정보',
    scheme: 'kakaonavi://',
    fallback: 'https://map.kakao.com',
  },
  {
    type: 'atlan',
    label: '아틀란',
    badge: 'A',
    description: '만도 · 오프라인 내비',
    scheme: 'atlan://',
    fallback: 'https://atlan.com',
  },
]

export const NAVI_STORAGE_KEY = 'moto_navi_pref'
