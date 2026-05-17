// courseStorage.ts — 내 주행 코스 로컬 저장소

export interface SavedCourse {
  id: string
  title: string
  distanceKm: number
  durationMin: number
  gpxPoints: Array<{ lat: number; lng: number; timestamp: number }>
  gpxXml: string
  createdAt: string
  isShared: boolean
}

const STORAGE_KEY = 'moto_my_courses'

// ── GPX XML 빌더 ───────────────────────────────────────────────
export function buildGpxXml(
  points: Array<{ lat: number; lng: number; timestamp: number }>
): string {
  const trkpts = points
    .map((p) => {
      const iso = new Date(p.timestamp).toISOString()
      return `    <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}"><time>${iso}</time></trkpt>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Moto-Log" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Moto-Log Ride</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
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
  all.unshift(course) // 최신순
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function shareCourse(id: string): void {
  const all = loadCourses()
  const idx = all.findIndex((c) => c.id === id)
  if (idx !== -1) {
    all[idx].isShared = true
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  }
}
