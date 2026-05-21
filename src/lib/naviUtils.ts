// naviUtils.ts — 내비게이션 앱 연동 유틸리티 (공유 lib)
// record/MapPage, my-routes/MyRoutesPage, components/DriveSessionOverlay 에서 사용

import { NAVI_STORAGE_KEY, type NavigationType } from '../types/ride'
import type { NaviWaypoint } from './driveSession'
import type { SavedCourse } from './courseStorage'

const NAVI_MAX_WP: Record<NavigationType, number> = {
  tmap:  5,
  kakao: 5,
  atlan: 4,
}

const enc = (s: string) => encodeURIComponent(s)

export function loadNaviPref(): NavigationType {
  return (localStorage.getItem(NAVI_STORAGE_KEY) as NavigationType) ?? 'tmap'
}

export function launchNavi(type: NavigationType): void {
  window.location.href = {
    tmap:  'tmap://',
    kakao: 'kakaonavi://',
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

export function splitIntoSegments(
  waypoints: NaviWaypoint[],
  naviType: NavigationType,
): NaviWaypoint[][] {
  if (waypoints.length === 0) return []
  const max      = NAVI_MAX_WP[naviType]
  const segments: NaviWaypoint[][] = []
  let i = 0
  while (i < waypoints.length) {
    const end = Math.min(i + max, waypoints.length)
    segments.push(waypoints.slice(i, end))
    if (end >= waypoints.length) break
    i = end - 1
  }
  return segments
}

export function buildSegmentDeepLink(
  type: NavigationType,
  segment: NaviWaypoint[],
  goalName: string,
): string {
  if (segment.length === 0) return ''
  if (segment.length === 1) return ''

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

  if (type === 'kakao') {
    // 카카오내비 딥링크: epx/epy 분리 형식 (ep=lng,lat 합산 형식 미지원)
    // 출발지(sp)는 현재 위치 자동 사용 — sp 파라미터 불필요
    // 경유지: via1x/via1y/via1name 형식
    let url = `kakaonavi://navigate`
    url += `?epx=${goal.lng}&epy=${goal.lat}&epname=${enc(goalName)}`
    vias.forEach((v, i) => {
      url += `&via${i + 1}x=${v.lng}&via${i + 1}y=${v.lat}&via${i + 1}name=${enc(`경유${i + 1}`)}`
    })
    return url
  }

  return 'atlan://'
}

export function launchNaviSegment(
  type: NavigationType,
  segment: NaviWaypoint[],
  goalName: string,
): void {
  const url = buildSegmentDeepLink(type, segment, goalName)
  if (url) window.location.href = url
}
