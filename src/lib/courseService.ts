import { supabase } from './supabaseClient'
import type { TourCardData } from '../components/TourCard'
import type { SavedCourse } from './courseStorage'

/* ── DB row → UI 타입 변환 ── */
function rowToCard(row: Record<string, unknown>): TourCardData {
  return {
    id: row.id as string,
    title: row.title as string,
    region: row.region as string,
    distanceKm: row.distance_km as number,
    mood: row.mood as TourCardData['mood'],
    description: (row.description as string | null) ?? undefined,
    tags: (row.tags as string[]) ?? [],
    imageUrl: (row.image_url as string | null) ?? undefined,
  }
}

/* ── 코스 목록 조회 ── */
export async function fetchCourses(): Promise<TourCardData[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[courseService] fetch 실패:', error.message)
    return []
  }
  return (data ?? []).map(rowToCard)
}

/* ── 코스 저장 (optimistic insert) ── */
export async function insertCourse(
  card: TourCardData
): Promise<TourCardData | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.warn('[courseService] 미로그인 상태 — 로컬에만 반영됩니다.')
    return null
  }

  const payload = {
    user_id: user.id,
    title: card.title,
    region: card.region,
    distance_km: card.distanceKm,
    mood: card.mood,
    description: card.description ?? null,
    tags: card.tags ?? [],
    image_url: card.imageUrl ?? null,
  }

  const { data, error } = await supabase
    .from('courses')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(payload as any)
    .select()
    .single()

  if (error) {
    console.error('[courseService] insert 실패:', error.message)
    return null
  }
  return rowToCard(data)
}

/* ════════════════════════════════════════════
   내 주행 기록 (user_courses) — SavedCourse CRUD
════════════════════════════════════════════ */

function rowToSavedCourse(row: Record<string, unknown>): SavedCourse {
  return {
    id:               row.id as string,
    title:            (row.title as string) ?? '',
    distanceKm:       (row.distance_km as number) ?? 0,
    durationMin:      (row.duration_min as number) ?? 0,
    gpxPoints:        (row.gpx_points as SavedCourse['gpxPoints']) ?? [],
    gpxXml:           (row.gpx_xml as string) ?? '',
    createdAt:        row.created_at as string,
    isShared:         (row.community_shared as boolean) ?? false,
    coverPhoto:       (row.cover_photo as string | null) ?? undefined,
    diary:            (row.diary as string | null) ?? undefined,
    communityShared:  (row.community_shared as boolean) ?? false,
    starRating:       (row.star_rating as number | null) ?? undefined,
    plannerWaypoints: (row.planner_waypoints as SavedCourse['plannerWaypoints']) ?? undefined,
  }
}

export async function fetchMyCourses(): Promise<SavedCourse[]> {
  const { courses } = await fetchMyCoursesAuth()
  return courses
}

/** 로그인 여부까지 함께 반환 — MyRoutesPage 에서 미로그인/빈목록 구분용 */
export async function fetchMyCoursesAuth(): Promise<{ courses: SavedCourse[]; loggedIn: boolean }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log('[courseService] ℹ️ 미로그인 상태 — 서버 조회 생략, 로컬 데이터 사용')
    return { courses: [], loggedIn: false }
  }
  const { data, error } = await supabase
    .from('user_courses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[courseService] ❌ fetchMyCourses 실패:', error.message, '| code:', error.code)
    return { courses: [], loggedIn: true }
  }
  console.log(`[courseService] ✅ 서버 로드 완료 — ${(data ?? []).length}개 코스`)
  return { courses: (data ?? []).map(rowToSavedCourse), loggedIn: true }
}

export async function insertMyCourse(course: SavedCourse): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { console.warn('[courseService] 미로그인 — 서버 저장 건너뜀'); return false }
  const { data, error } = await supabase.from('user_courses').insert({
    id:                course.id,
    user_id:           user.id,
    title:             course.title,
    distance_km:       course.distanceKm,
    duration_min:      course.durationMin,
    gpx_points:        course.gpxPoints,
    gpx_xml:           course.gpxXml ?? null,
    cover_photo:       course.coverPhoto ?? null,
    diary:             course.diary ?? null,
    community_shared:  course.communityShared ?? false,
    star_rating:       course.starRating ?? null,
    planner_waypoints: course.plannerWaypoints ?? null,
    created_at:        course.createdAt,
  }).select().single()
  if (error) {
    console.error('[courseService] ❌ insertMyCourse 실패:', error.message, '| code:', error.code)
    return false
  }
  console.log('[courseService] ✅ 서버 저장 완료 — id:', data.id)
  return true
}

export async function updateMyCourse(id: string, partial: Partial<SavedCourse>): Promise<boolean> {
  const payload: Record<string, unknown> = {}
  if (partial.diary       !== undefined) payload.diary         = partial.diary
  if (partial.coverPhoto  !== undefined) payload.cover_photo   = partial.coverPhoto
  if (partial.communityShared !== undefined) payload.community_shared = partial.communityShared
  const { error } = await supabase.from('user_courses').update(payload).eq('id', id).select()
  if (error) {
    console.error('[courseService] ❌ updateMyCourse 실패:', error.message, '| id:', id)
    return false
  }
  console.log('[courseService] ✅ 서버 수정 완료 — id:', id)
  return true
}

export async function deleteMyCourse(id: string): Promise<boolean> {
  const { error } = await supabase.from('user_courses').delete().eq('id', id)
  if (error) { console.error('[courseService] deleteMyCourse 실패:', error.message); return false }
  return true
}
