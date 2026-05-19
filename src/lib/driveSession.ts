// driveSession.ts — 주행 세션 localStorage 관리
// 네비 앱 전환 중에도 어떤 코스의 몇 번째 구간인지 기억

import type { NavigationType } from '../pages/map/types'

export interface NaviWaypoint {
  lat: number
  lng: number
}

export interface DriveSession {
  courseId:          string
  courseTitle:       string
  naviType:          NavigationType
  segments:          NaviWaypoint[][]   // 분할된 구간 배열
  currentSegmentIdx: number             // 다음에 실행할 구간 인덱스 (0-based)
  startedAt:         string             // ISO timestamp
}

const KEY = 'moto:driveSession'

export function saveDriveSession(session: DriveSession): void {
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function loadDriveSession(): DriveSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as DriveSession) : null
  } catch {
    return null
  }
}

export function clearDriveSession(): void {
  localStorage.removeItem(KEY)
}

/** 현재 구간을 완료 처리하고 다음 구간으로 전진. 업데이트된 세션 반환 */
export function advanceDriveSegment(): DriveSession | null {
  const session = loadDriveSession()
  if (!session) return null
  const updated: DriveSession = {
    ...session,
    currentSegmentIdx: session.currentSegmentIdx + 1,
  }
  saveDriveSession(updated)
  return updated
}

/** 세션이 아직 끝나지 않은 구간이 남아있는지 확인 */
export function hasRemainingSegments(session: DriveSession): boolean {
  return session.currentSegmentIdx < session.segments.length
}
