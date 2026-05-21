import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const LAST_TAB_KEY = 'moto:lastTab'

/**
 * BrowserRouter 안에 한 번만 렌더링되는 전역 Auth 상태 감지 컴포넌트.
 *
 * SIGNED_IN 이벤트는 최초 로그인뿐 아니라
 * 갤러리·카메라 등 외부 앱 전환 후 복귀 시에도 Supabase 세션 재검증으로 재발화한다.
 * → 로그인 페이지('/')에서만 앱 탭으로 이동하고,
 *   이미 앱 안에 있을 때는 아무것도 하지 않아 의도치 않은 페이지 이탈을 방지.
 */
export default function AuthListener() {
  const navigate    = useNavigate()
  const { pathname } = useLocation()

  // 구독 클로저가 항상 최신 pathname을 읽도록 ref 사용
  const pathnameRef = useRef(pathname)
  useEffect(() => { pathnameRef.current = pathname }, [pathname])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // 로그인 화면('/')에서만 앱으로 진입 — 앱 내 재검증 시 이탈 방지
        if (pathnameRef.current === '/') {
          const lastTab = sessionStorage.getItem(LAST_TAB_KEY) || '/courses'
          navigate(lastTab)
        }
      }
      if (event === 'SIGNED_OUT') {
        navigate('/')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return null
}
