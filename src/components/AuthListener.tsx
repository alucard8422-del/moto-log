import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

/**
 * BrowserRouter 안에 한 번만 렌더링되는 전역 Auth 상태 감지 컴포넌트.
 * SIGNED_IN 이벤트 → /map 이동 (TourPage·ProfilePage useEffect 재실행 트리거)
 */
export default function AuthListener() {
  const navigate = useNavigate()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        console.log('[AuthListener] 로그인 감지 → /map 이동')
        navigate('/map')
      }
      if (event === 'SIGNED_OUT') {
        console.log('[AuthListener] 로그아웃 감지 → / 이동')
        navigate('/')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return null
}
