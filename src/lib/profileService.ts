import { supabase } from './supabaseClient'
import type { GarageData } from '../features/garage/GarageEditModal'

/* ── 프로필 조회 ── */
export async function fetchProfile(): Promise<GarageData | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.warn('[profileService] 미로그인 상태 — 로컬 기본값을 사용합니다.')
    return null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    // PGRST116 = 행 없음 (신규 가입 직후 트리거 미실행 시)
    if (error.code !== 'PGRST116') {
      console.error('[profileService] fetch 실패:', error.message)
    }
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any
  return {
    bikeModel: row.bike_model as string,
    totalKm: row.total_km as number,
    ridingHours: row.riding_hours as string,
    completedCourses: row.completed_courses as number,
  }
}

/* ── 프로필 저장 / 갱신 ── */
export async function upsertProfile(garage: GarageData): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.warn('[profileService] 미로그인 상태 — 서버 저장 생략.')
    return false
  }

  const payload = {
    id: user.id,
    bike_model: garage.bikeModel,
    total_km: garage.totalKm,
    riding_hours: garage.ridingHours,
    completed_courses: garage.completedCourses,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('profiles')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(payload as any, { onConflict: 'id' })

  if (error) {
    console.error('[profileService] upsert 실패:', error.message)
    return false
  }

  console.log('[profileService] 프로필 저장 완료')
  return true
}
