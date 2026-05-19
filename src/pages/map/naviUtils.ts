// naviUtils.ts — 내비게이션 앱 연동 유틸리티
// 경유지 세그먼트 분할 + 딥링크 생성

import { NAVI_STORAGE_KEY, type NavigationType } from './types'
import type { NaviWaypoint } from '../../lib/driveSession'
import type { SavedCourse } from '../../lib/courseStorage'

// ── 네비 앱별 세그먼트당 최대 경유지 수 (via 포함 총 목적지 포인트) ────────
// TMap:  via1·via2·via3 + goal = 4
// Kakao: via1·via2·via3 + ep   = 4
// Atlan: 공식 문서 없음, 동일하게 4로 제한
const NAVI_MAX_WP: Record<NavigationType, number> = {
  tmap:  4,
  kakao: 4,
  atlan: 4,
}

const enc = (s: string) => encodeURIComponent(s)

// ── 저장된 내비 설정 불러오기 ────────────────────────────────────────────
export function loadNaviPref(): NavigationType {
  return (localStorage.getItem(NAVI_STORAGE_KEY) as NavigationType) ?? 'tmap'
}

// ── 단순 앱 실행 (목적지 없음) ───────────────────────────────────────────
export function launchNavi(type: NavigationType): void {
  window.location.href = {
    tmap:  'tmap://',
    kakao: 'kakaonavi://',
    atlan: 'atlan://',
  }[type]
}

// ── 코스에서 네비 경유지 추출 ────────────────────────────────────────────
// plannerWaypoints 가 있으면 그대로 사용, 없으면 gpxPoints 샘플링
export function getCourseNavWaypoints(course: SavedCourse): NaviWaypoint[] {
  if (course.plannerWaypoints && course.plannerWaypoints.length >= 2) {
    return course.plannerWaypoints
  }
  return sampleGpxToWaypoints(course.gpxPoints, 10)
}

function sampleGpxToWaypoints(
  pts: Array<{ lat: number; lng: number; timestamp: number }>,
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

// ── 경유지 배열을 네비 앱 한계에 맞게 구간 분할 ─────────────────────────
export function splitIntoSegments(
  waypoints: NaviWaypoint[],
  naviType: NavigationType,
): NaviWaypoint[][] {
  const max = NAVI_MAX_WP[naviType]
  const segments: NaviWaypoint[][] = []
  for (let i = 0; i < waypoints.length; i += max) {
    segments.push(waypoints.slice(i, i + max))
  }
  return segments
}

// ── 세그먼트 딥링크 생성 ─────────────────────────────────────────────────
// segment 배열: 마지막 = 목적지, 나머지 = 경유지
export function buildSegmentDeepLink(
  type: NavigationType,
  segment: NaviWaypoint[],
  goalName: string,
): string {
  if (segment.length === 0) return ''

  const goal = segment[segment.length - 1]
  const vias = segment.slice(0, -1)

  if (type === 'tmap') {
    let url = `tmap://route?goalname=${enc(goalName)}&goalx=${goal.lng}&goaly=${goal.lat}`
    url += `&reqCoordType=WGS84GEO&resCoordType=WGS84GEO`
    vias.forEach((v, i) => {
      url += `&via${i + 1}name=${enc(`경유${i + 1}`)}&via${i + 1}x=${v.lng}&via${i + 1}y=${v.lat}`
    })
    return url
  }

  if (type === 'kakao') {
    let url = `kakaonavi://navigate?ep=${goal.lng},${goal.lat}&epname=${enc(goalName)}`
    vias.forEach((v, i) => {
      url += `&via${i + 1}=${v.lng},${v.lat}&via${i + 1}name=${enc(`경유${i + 1}`)}`
    })
    return url
  }

  // atlan: 경유지 딥링크 공식 미지원 — 앱만 실행
  return 'atlan://'
}

// ── 세그먼트 딥링크로 네비 실행 ──────────────────────────────────────────
export function launchNaviSegment(
  type: NavigationType,
  segment: NaviWaypoint[],
  goalName: string,
): void {
  const url = buildSegmentDeepLink(type, segment, goalName)
  if (url) window.location.href = url
}
