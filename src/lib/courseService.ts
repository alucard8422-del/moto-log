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
   이미지 압축 (Canvas API) — 500KB 이하 보장
════════════════════════════════════════════ */

/** base64 이미지를 JPEG 500KB 이하로 압축해 반환 */
async function compressImage(base64: string, maxBytes = 500 * 1024): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.onerror = () => resolve(base64)   // 파싱 실패 시 원본 그대로
    img.onload  = () => {
      const MAX_DIM = 1920
      let w = img.naturalWidth, h = img.naturalHeight
      if (w > MAX_DIM || h > MAX_DIM) {
        const r = Math.min(MAX_DIM / w, MAX_DIM / h)
        w = Math.round(w * r); h = Math.round(h * r)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)

      let quality = 0.82
      const tryNext = () => {
        const out   = canvas.toDataURL('image/jpeg', quality)
        const bytes = Math.round((out.length * 3) / 4)
        if (bytes <= maxBytes || quality <= 0.25) { resolve(out); return }
        quality -= 0.10
        tryNext()
      }
      tryNext()
    }
    img.src = base64
  })
}

/**
 * base64 이미지를 압축 후 Supabase Storage `course-images` 버킷에 업로드.
 * 성공 시 Public URL 반환, 실패 시 null 반환.
 * 파일명: `{timestamp}_{courseId}.jpg`
 */
export async function uploadCourseImage(base64: string, courseId: string): Promise<string | null> {
  try {
    const compressed = await compressImage(base64)
    const arr  = compressed.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg'
    const bstr = atob(arr[1])
    const u8   = new Uint8Array(bstr.length)
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i)
    const blob = new Blob([u8], { type: mime })

    const fileName = `${Date.now()}_${courseId}.jpg`
    console.log('[courseService] Storage 업로드 시도 — 파일:', fileName, '| 용량:', Math.round(blob.size / 1024), 'KB')

    const { data, error } = await supabase.storage
      .from('course-images')
      .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true })

    if (error) {
      console.error('🚨 [치명적 저장 에러]: Storage 업로드 실패\n  메시지:', error.message)
      return null
    }

    const { data: urlData } = supabase.storage.from('course-images').getPublicUrl(data.path)
    console.log('[courseService] ✅ Storage 업로드 완료 — URL:', urlData.publicUrl)
    return urlData.publicUrl
  } catch (e) {
    console.error('🚨 [치명적 저장 에러]: uploadCourseImage 예외:', e)
    return null
  }
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
  if (!user) {
    console.warn('[courseService] ⚠️ 미로그인 상태 — 서버 저장 건너뜀. 로컬에는 저장되어 있습니다.')
    return false
  }
  console.log('[courseService] 서버 저장 시도 — user_id:', user.id, '| course_id:', course.id)
  // upsert: 동일 id가 이미 존재하면 덮어쓰기 (중복 insert 에러 방어)
  const { data, error } = await supabase.from('user_courses').upsert({
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
  }, { onConflict: 'id' }).select().single()
  if (error) {
    console.error(
      '🚨 [치명적 저장 에러]: user_courses insert 실패 (데이터는 로컬에 보존됨)\n',
      '  메시지:', error.message,
      '| 코드:', error.code,
      '| hint:', error.hint ?? '없음',
    )
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
    console.error('🚨 [치명적 저장 에러]: user_courses update 실패\n  메시지:', error.message, '| id:', id, '| 코드:', error.code)
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
