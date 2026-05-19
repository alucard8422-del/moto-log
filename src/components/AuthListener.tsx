import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const LAST_TAB_KEY = 'moto:lastTab'

/**
 * BrowserRouter 안에 한 번만 렌더링되는 전역 Auth 상태 감지 컴포넌트.
 * SIGNED_IN 이벤트 → 마지막 탭(sessionStorage) 또는 /map 이동
 */
export default function AuthListener() {
  const navigate = useNavigate()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        const lastTab = sessionStorage.getItem(LAST_TAB_KEY) || '/map'
        console.log('[AuthListener] 로그인 감지 →', lastTab, '이동')
        navigate(lastTab)
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
