import { supabase } from './supabaseClient'

export type FuelType = 'regular' | 'premium'

export interface FuelLog {
  storeName: string
  amount: number
  fuelType: FuelType
  loggedAt: string
}

export async function saveFuelLog(log: FuelLog): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.warn('[fuelService] 미로그인 — 로컬에만 기록됩니다.')
    return false
  }

  const { error } = await supabase.from('fuel_logs').insert({
    user_id: user.id,
    store_name: log.storeName,
    amount: log.amount,
    fuel_type: log.fuelType,
    logged_at: log.loggedAt,
  })

  if (error) {
    console.error('[fuelService] 저장 실패:', error.message)
    return false
  }

  console.log('[fuelService] 주유 기록 저장 완료:', log)
  return true
}
