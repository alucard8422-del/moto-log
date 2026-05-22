// naviUtils.ts — 내비게이션 앱 연동 유틸리티 (공유 lib)
// record/MapPage, my-routes/MyRoutesPage, components/DriveSessionOverlay 에서 사용

import { NAVI_STORAGE_KEY, type NavigationType } from '../types/ride'
import type { NaviWaypoint } from './driveSession'
import type { SavedCourse } from './courseStorage'

const KAKAO_JS_KEY = 'd2430786a3a92cc28ebf4f0a22993062'

const NAVI_MAX_WP: Record<NavigationType, number> = {
  tmap:  5,
  kakao: 5,   // SDK viaPoints는 3개까지 — 초과분은 launchKakaoNaviSdk에서 잘라냄
  atlan: 4,
}

const enc = (s: string) => encodeURIComponent(s)

// ── Kakao JS SDK 타입 선언 (Maps SDK의 window.kakao와 별개) ───────────────
declare global {
  interface Window {
    Kakao?: {
      init:          (key: string) => void
      isInitialized: () => boolean
      Navi: {
        start: (params: {
          name:        string
          x:           number   // 경도(lng)
          y:           number   // 위도(lat)
          coordType?:  'wgs84' | 'katec'
          sX?:         number   // 출발 경도
          sY?:         number   // 출발 위도
          viaPoints?:  Array<{ name: string; x: number; y: number }>
          routeInfo?:  boolean
          vehicleType?: number
          rpOption?:   number
        }) => void
      }
    }
  }
}

// ── Kakao JS SDK 동적 로드 ────────────────────────────────────────────────
function loadKakaoJsSdk(): Promise<void> {
  if (window.Kakao) return Promise.resolve()

  // 이미 script 태그가 있으면 load 이벤트 대기
  const existing = document.querySelector<HTMLScriptElement>('script[src*="kakao_js_sdk"]')
  if (existing) {
    return new Promise(resolve => existing.addEventListener('load', () => resolve(), { once: true }))
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src         = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js'
    s.crossOrigin = 'anonymous'
    s.onload  = () => resolve()
    s.onerror = () => reject(new Error('Kakao JS SDK load failed'))
    document.head.appendChild(s)
  })
}

// ── Kakao.Navi.start() — JS SDK 방식 (인증 문제 없음, viaPoints 최대 3개) ─
async function launchKakaoNaviSdk(
  segment:  NaviWaypoint[],
  goalName: string,
): Promise<void> {
  if (segment.length < 2) return
  const start = segment[0]
  const goal  = segment[segment.length - 1]
  const vias  = segment.slice(1, -1).slice(0, 3)   // SDK 최대 3개

  try {
    await loadKakaoJsSdk()
    if (!window.Kakao!.isInitialized()) window.Kakao!.init(KAKAO_JS_KEY)

    window.Kakao!.Navi.start({
      name:      goalName || '목적지',
      x:         goal.lng,
      y:         goal.lat,
      coordType: 'wgs84',
      sX:        start.lng,
      sY:        start.lat,
      viaPoints: vias.map((v, i) => ({ name: `경유${i + 1}`, x: v.lng, y: v.lat })),
    })
    console.log('[KakaoNavi] Kakao.Navi.start() 호출 완료, viaPoints:', vias.length)
  } catch (e) {
    console.warn('[KakaoNavi] SDK 실패 → kakaomap:// 폴백:', e)
    // 폴백: kakaomap:// 딥링크 (경유지 미지원, 출발→도착만)
    window.location.href =
      `kakaomap://route?sp=${start.lat},${start.lng}&ep=${goal.lat},${goal.lng}&by=CAR`
  }
}

// ── 공개 API ──────────────────────────────────────────────────────────────

export function loadNaviPref(): NavigationType {
  return (localStorage.getItem(NAVI_STORAGE_KEY) as NavigationType) ?? 'tmap'
}

export function launchNavi(type: NavigationType): void {
  window.location.href = {
    tmap:  'tmap://',
    kakao: 'kakaomap://',
    atlan: 'atlan://',
  }[type]
}

export function getCourseNavWaypoints(course: SavedCourse): NaviWaypoint[] {
  if (course.plannerWaypoints && course.plannerWaypoints.length >= 2) {
    return course.plannerWaypoints
  }
  return sampleGpxToWaypoints(course.gpxPoints, 10)
}

function sampleGpxToWaypoints(
  pts:    Array<{ lat: number; lng: number; timestamp: number }>,
  target: number,
): NaviWaypoint[] {
  if (pts.length === 0) return []
  if (pts.length <= target) return pts.map(p => ({ lat: p.lat, lng: p.lng }))
  const result: NaviWaypoint[] = []
  const step = (pts.length - 1) / (target - 1)
  for (let i = 0; i < target; i++) {
    const idx = Math.min(Math.round(i * step), pts.length - 1)
    result.push({ lat: pts[idx].lat, lng: pts[idx].lng })
  }
  return result
}

export function splitIntoSegments(
  waypoints: NaviWaypoint[],
  naviType:  NavigationType,
): NaviWaypoint[][] {
  if (waypoints.length === 0) return []
  const max      = NAVI_MAX_WP[naviType]
  const segments: NaviWaypoint[][] = []
  let i = 0
  while (i < waypoints.length) {
    const end = Math.min(i + max, waypoints.length)
    segments.push(waypoints.slice(i, end))
    if (end >= waypoints.length) break
    i = end   // 겹침 없이 다음 구간 시작 — (1-5번) (6-10번) 깔끔히 분리
  }
  return segments
}

export function buildSegmentDeepLink(
  type:     NavigationType,
  segment:  NaviWaypoint[],
  goalName: string,
): string {
  if (segment.length < 2) return ''
  const start = segment[0]
  const goal  = segment[segment.length - 1]
  const vias  = segment.slice(1, -1)

  if (type === 'tmap') {
    let url = `tmap://route`
    url += `?startname=${enc('출발')}&startx=${start.lng}&starty=${start.lat}`
    url += `&goalname=${enc(goalName)}&goalx=${goal.lng}&goaly=${goal.lat}`
    url += `&reqCoordType=WGS84GEO&resCoordType=WGS84GEO`
    vias.forEach((v, i) => {
      url += `&via${i + 1}name=${enc(`경유${i + 1}`)}&via${i + 1}x=${v.lng}&via${i + 1}y=${v.lat}`
    })
    return url
  }

  // kakao → SDK 방식 사용(launchNaviSegment에서 처리), 여기서는 빈 문자열
  // atlan 폴백
  return 'atlan://'
}

/**
 * 내비 앱 실행
 * - tmap/atlan: window.location.href 딥링크
 * - kakao:      Kakao.Navi.start() JS SDK (async, fire-and-forget)
 */
export function launchNaviSegment(
  type:     NavigationType,
  segment:  NaviWaypoint[],
  goalName: string,
): void {
  if (segment.length < 2) return
  if (type === 'kakao') {
    launchKakaoNaviSdk(segment, goalName)   // async → fire-and-forget
    return
  }
  const url = buildSegmentDeepLink(type, segment, goalName)
  if (url) window.location.href = url
}
