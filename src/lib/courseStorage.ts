// courseStorage.ts — 내 주행 코스 로컬 저장소

export interface CourseComment {
  id: string
  text: string
  createdAt: string
}

export interface SavedCourse {
  id: string
  title: string
  distanceKm: number
  durationMin: number
  gpxPoints: Array<{ lat: number; lng: number; timestamp: number; altitude?: number; speed?: number; heading?: number }>
  gpxXml: string
  createdAt: string
  isShared: boolean
  coverPhoto?: string       // 대표 사진 (base64 or URL)
  diary?: string            // 사후 작성 후기
  communityShared?: boolean // 커뮤니티 공유 여부
  starRating?: number       // 평균 별점 (1–5)
  comments?: CourseComment[]
  startCity?: string        // 리버스 지오코딩 출발 도시
  endCity?: string          // 리버스 지오코딩 도착 도시
  plannerWaypoints?: Array<{ lat: number; lng: number }> // 경로 작성 시 원본 경유지 (주행하기용)
}

const STORAGE_KEY = 'moto_my_courses'

// ── GPX XML 빌더 ──────────────────────────────────────────────
export function buildGpxXml(
  points: Array<{ lat: number; lng: number; timestamp: number; altitude?: number; speed?: number; heading?: number }>
): string {
  const trkpts = points
    .map((p) => {
      const iso = new Date(p.timestamp).toISOString()
      const ele = p.altitude != null ? `<ele>${p.altitude.toFixed(1)}</ele>` : ''
      const ext = (p.speed != null || p.heading != null)
        ? `<extensions><gpxtpx:TrackPointExtension>${
            p.speed   != null ? `<gpxtpx:speed>${p.speed.toFixed(2)}</gpxtpx:speed>` : ''
          }${
            p.heading != null ? `<gpxtpx:course>${p.heading.toFixed(1)}</gpxtpx:course>` : ''
          }</gpxtpx:TrackPointExtension></extensions>`
        : ''
      return `    <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}">${ele}<time>${iso}</time>${ext}</trkpt>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Moto-Log"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <trk><name>Moto-Log Ride</name><trkseg>
${trkpts}
  </trkseg></trk>
</gpx>`
}

// ── CRUD ──────────────────────────────────────────────────────
export function loadCourses(): SavedCourse[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveCourse(course: SavedCourse): void {
  const all = loadCourses()
  all.unshift(course)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function updateCourse(id: string, partial: Partial<SavedCourse>): void {
  const all = loadCourses()
  const idx = all.findIndex((c) => c.id === id)
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...partial }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  }
}

export function deleteCourse(id: string): void {
  const all = loadCourses().filter((c) => c.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function shareCourse(id: string): void {
  updateCourse(id, { isShared: true })
}

// 커뮤니티 공유 (추천 코스 탭으로 노출)
export function shareToCommunity(id: string): void {
  updateCourse(id, { communityShared: true, isShared: true })
}

// 별점 추가 (평균 계산)
export function addStarRating(id: string, stars: number): void {
  updateCourse(id, { starRating: Math.min(5, Math.max(1, stars)) })
}

// 댓글 추가
export function addComment(id: string, text: string): void {
  const all = loadCourses()
  const idx = all.findIndex((c) => c.id === id)
  if (idx !== -1) {
    const prev = all[idx].comments ?? []
    all[idx].comments = [
      ...prev,
      { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() },
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  }
}

// 커뮤니티 공유된 코스만 반환
export function loadCommunityCourses(): SavedCourse[] {
  return loadCourses().filter((c) => c.communityShared)
}
