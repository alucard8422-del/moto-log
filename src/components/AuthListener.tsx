import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

/**
 * BrowserRouter 안에 한 번만 렌더링되는 전역 Auth 상태 감지 컴포넌트.
 *
 * 1. 마운트 시 기존 세션 즉시 확인 → 로그인 상태면 깜빡임 없이 /courses 이동
 * 2. SIGNED_IN 이벤트: 로그인 화면('/')에서만 앱으로 진입
 *    (외부 앱 전환 후 복귀 시 재검증으로 재발화하므로, 앱 내에서는 무시)
 * 3. SIGNED_OUT 이벤트: 로그인 화면('/')으로 이동
 */
export default function AuthListener() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()

  // 구독 클로저가 항상 최신 pathname을 읽도록 ref 사용
  const pathnameRef = useRef(pathname)
  useEffect(() => { pathnameRef.current = pathname }, [pathname])

  // ── 마운트 시 기존 세션 즉시 체크 ────────────────────────────────────
  // 이미 로그인된 상태로 앱을 열면 로그인 화면 깜빡임 없이 바로 이동
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && pathnameRef.current === '/') {
        navigate('/courses', { replace: true })
      }
    })
  }, [navigate])

  // ── 실시간 Auth 이벤트 ────────────────────────────────────────────────
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // 로그인 화면('/')에서만 앱으로 진입 — 앱 내 재검증 시 이탈 방지
        if (pathnameRef.current === '/') {
          navigate('/courses')
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
