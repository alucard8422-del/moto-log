// naviUtils.ts — 내비게이션 앱 연동 유틸리티
// 경유지 세그먼트 분할 + 딥링크 생성

import { NAVI_STORAGE_KEY, type NavigationType } from './types'
import type { NaviWaypoint } from '../../lib/driveSession'
import type { SavedCourse } from '../../lib/courseStorage'

// ── 네비 앱별 세그먼트당 최대 포인트 수 (출발 포함 총 등록 가능 포인트) ────
// TMap:  startx + via1·via2·via3 + goal = 5
// Kakao: sp    + via1·via2·via3 + ep   = 5
// Atlan: 공식 문서 없음, goal + via1-via3 = 4 (출발 파라미터 미지원)
const NAVI_MAX_WP: Record<NavigationType, number> = {
  tmap:  5,
  kakao: 5,
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
// 세그먼트 N의 마지막 포인트 = 세그먼트 N+1의 첫 포인트 (overlap 1개)
// → 다음 구간 시작 시 사용자의 현재 위치(출발지)와 일치
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
    i = end - 1   // 이전 구간 마지막 = 다음 구간 시작 (출발지 연속성 보장)
  }
  return segments
}

// ── 세그먼트 딥링크 생성 ─────────────────────────────────────────────────
// segment 구조: [출발, ...경유지, 목적지]
//  - segment[0]        = 출발지 (startx / sp) — 명시적으로 전달
//  - segment[1..-2]    = 경유지 via1~via3 (최대 3개)
//  - segment[-1]       = 목적지 (goal / ep)
export function buildSegmentDeepLink(
  type: NavigationType,
  segment: NaviWaypoint[],
  goalName: string,
): string {
  if (segment.length === 0) return ''
  if (segment.length === 1) return ''   // 출발=목적지, 라우팅 불필요

  const start = segment[0]
  const goal  = segment[segment.length - 1]
  const vias  = segment.slice(1, -1)   // 출발·목적지 제외한 중간 경유지 (최대 3개)

  if (type === 'tmap') {
    // TMap: startx/starty(출발) + via1-via3(경유) + goalx/goaly(목적지) = 최대 5포인트
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
    // KakaoNavi: sp(출발) + via1-via3(경유) + ep(목적지) = 최대 5포인트
    let url = `kakaonavi://navigate`
    url += `?sp=${start.lng},${start.lat}&spname=${enc('출발')}`
    url += `&ep=${goal.lng},${goal.lat}&epname=${enc(goalName)}`
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
