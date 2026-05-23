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

// ── 하버사인 거리 (km) — 샘플링용 ──────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * GPX 포인트 배열에서 내비 경유지를 균등 거리 기준으로 샘플링
 *
 * 기존 인덱스 기반 방식은 정체 구간(GPS 포인트 밀집)이 과대 표현되고
 * 고속 구간(포인트 희박)이 건너뛰어지는 문제가 있었음.
 * 거리 기반 샘플링으로 경로 전체에 균등하게 분산된 경유지를 추출.
 */
function sampleGpxToWaypoints(
  pts:    Array<{ lat: number; lng: number; timestamp: number }>,
  target: number,
): NaviWaypoint[] {
  if (pts.length === 0) return []
  if (pts.length <= target) return pts.map(p => ({ lat: p.lat, lng: p.lng }))

  // 누적 거리 배열 계산
  const cumDist: number[] = [0]
  for (let i = 1; i < pts.length; i++) {
    cumDist.push(cumDist[i - 1] + haversineKm(
      pts[i - 1].lat, pts[i - 1].lng,
      pts[i].lat,     pts[i].lng,
    ))
  }
  const totalDist = cumDist[cumDist.length - 1]
  if (totalDist === 0) return [{ lat: pts[0].lat, lng: pts[0].lng }]

  // 균등 거리 간격으로 가장 가까운 포인트 선택
  const result: NaviWaypoint[] = []
  for (let i = 0; i < target; i++) {
    const targetDist = (i / (target - 1)) * totalDist
    let closest = 0
    let minDiff  = Infinity
    for (let j = 0; j < pts.length; j++) {
      const diff = Math.abs(cumDist[j] - targetDist)
      if (diff < minDiff) { minDiff = diff; closest = j }
    }
    result.push({ lat: pts[closest].lat, lng: pts[closest].lng })
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
