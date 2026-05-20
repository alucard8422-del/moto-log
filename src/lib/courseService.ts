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
  // ── 페이로드 유효성 검사 ─────────────────────────────────────────────────
  // [필수값 확인]
  if (!course.id || !user.id) {
    console.error('🚨 Supabase 거부 상세 사유: id 또는 user_id가 비어 있음 — 저장 중단', { id: course.id, userId: user.id })
    return false
  }

  // [base64 차단] cover_photo가 data: URI이면 서버에 보내지 않음 (용량 폭탄 방지)
  const safeCoverPhoto = (() => {
    const p = course.coverPhoto ?? null
    if (p?.startsWith('data:')) {
      console.warn('[courseService] ⚠️ cover_photo가 base64 — 서버 전송 건너뜀 (Storage URL만 허용)')
      return null
    }
    return p
  })()

  // [gpx_xml 크기 제한] 100KB 초과 시 저장 생략 (PostgREST 요청 크기 방어)
  const safeGpxXml = (() => {
    const xml = course.gpxXml ?? null
    if (xml && xml.length > 100_000) {
      console.warn(`[courseService] ⚠️ gpx_xml 크기 초과 (${Math.round(xml.length / 1024)}KB) — 서버 저장 생략`)
      return null
    }
    return xml
  })()

  // [gpx_points 안전 직렬화] jsonb 컬럼 전달 시 배열 그대로, text 컬럼 대비 stringify 포함
  const safeGpxPoints = Array.isArray(course.gpxPoints) ? course.gpxPoints : []

  const payload = {
    id:                course.id,
    user_id:           user.id,
    title:             course.title          ?? '',
    distance_km:       course.distanceKm     ?? 0,
    duration_min:      course.durationMin    ?? 0,
    gpx_points:        safeGpxPoints,
    gpx_xml:           safeGpxXml,
    cover_photo:       safeCoverPhoto,
    diary:             course.diary          ?? null,
    community_shared:  course.communityShared ?? false,
    star_rating:       course.starRating      ?? null,
    planner_waypoints: course.plannerWaypoints ?? null,
    created_at:        course.createdAt       ?? new Date().toISOString(),
  }

  // 전송 직전 크기 진단 로그
  const payloadJson = JSON.stringify(payload)
  console.log(
    '[courseService] 서버 저장 시도 — user_id:', user.id,
    '| course_id:', course.id,
    '| payload 크기:', Math.round(payloadJson.length / 1024), 'KB',
  )

  const { data, error } = await supabase.from('user_courses').upsert(
    payload, { onConflict: 'id' }
  ).select().single()
  if (error) {
    console.error(
      '🚨 Supabase 거부 상세 사유:', error,
      '\n  메시지:', error.message,
      '\n  코드:',   error.code,
      '\n  details:', (error as any).details ?? '없음',
      '\n  hint:',    error.hint    ?? '없음',
    )
    return false
  }
  console.log('[courseService] ✅ 서버 저장 완료 — id:', data.id)
  return true
}

export async function updateMyCourse(id: string, partial: Partial<SavedCourse>): Promise<boolean> {
  if (!id) {
    console.error('🚨 Supabase 거부 상세 사유 (update): id가 비어 있음 — 저장 중단')
    return false
  }
  const payload: Record<string, unknown> = {}
  if (partial.diary !== undefined) payload.diary = partial.diary
  if (partial.coverPhoto !== undefined) {
    // base64 차단 — Storage URL만 허용
    if (partial.coverPhoto?.startsWith('data:')) {
      console.warn('[courseService] ⚠️ cover_photo가 base64 — update 서버 전송 건너뜀')
    } else {
      payload.cover_photo = partial.coverPhoto
    }
  }
  if (partial.communityShared !== undefined) payload.community_shared = partial.communityShared
  if (Object.keys(payload).length === 0) {
    console.warn('[courseService] ⚠️ update payload가 비어 있음 — 전송 건너뜀')
    return true
  }
  console.log('[courseService] update 전송 — id:', id, '| 필드:', Object.keys(payload).join(', '))

  // ── UPDATE 시도 → 0행이면 코스가 서버에 없는 것 → 로컬에서 전체 코스 읽어 INSERT 폴백 ──
  const { data: updated, error } = await supabase
    .from('user_courses')
    .update(payload)
    .eq('id', id)
    .select()

  if (error) {
    console.error(
      '🚨 Supabase 거부 상세 사유 (update):', error,
      '\n  메시지:', error.message,
      '\n  코드:',   error.code,
      '\n  details:', (error as any).details ?? '없음',
      '\n  hint:',    error.hint    ?? '없음',
      '\n  id:', id,
    )
    return false
  }

  // 업데이트된 행이 0개 = 서버에 코스가 없음 → 로컬 전체 데이터로 upsert
  if (!updated || updated.length === 0) {
    console.warn('[courseService] ⚠️ update 0행 — 서버에 코스 없음. 로컬에서 읽어 upsert 시도...')
    const { loadCourses } = await import('./courseStorage')
    const localCourses = loadCourses()
    const found = localCourses.find(c => c.id === id)
    if (found) {
      // diary/coverPhoto 최신값 병합 후 upsert
      const merged = {
        ...found,
        diary:      partial.diary      ?? found.diary,
        coverPhoto: partial.coverPhoto ?? found.coverPhoto,
      }
      const ok = await insertMyCourse(merged)
      if (ok) console.log('[courseService] ✅ 폴백 upsert 완료 — id:', id)
      else    console.warn('[courseService] ⚠️ 폴백 upsert 실패 — id:', id)
      return ok
    } else {
      console.warn('[courseService] ⚠️ 로컬에서도 코스 없음 — id:', id)
      return false
    }
  }

  console.log('[courseService] ✅ 서버 수정 완료 — id:', id)
  return true
}

export async function deleteMyCourse(id: string): Promise<boolean> {
  const { error } = await supabase.from('user_courses').delete().eq('id', id)
  if (error) { console.error('[courseService] deleteMyCourse 실패:', error.message); return false }
  return true
}
