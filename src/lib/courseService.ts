import { supabase } from './supabaseClient'
import type { TourCardData } from '../components/TourCard'

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
