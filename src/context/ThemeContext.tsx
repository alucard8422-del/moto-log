// ThemeContext.tsx — 앱 전역 테마 상태 관리
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Theme = 'light' | 'navy' | 'warm'

// HTML root에 적용할 CSS 클래스 (index.css와 1:1 대응)
// 'light'는 :root 자체가 라이트 테마 → 클래스 없음
const CLASS_MAP: Record<Theme, string> = {
  light: '',
  navy:  'theme-navy',
  warm:  'theme-warm',
}

export const THEME_LABEL: Record<Theme, string> = {
  light: '라이트',
  navy:  '네이비',
  warm:  '웜',
}

interface ThemeCtx {
  theme:      Theme
  setTheme:   (t: Theme) => void
  themeLabel: string
}

const Ctx = createContext<ThemeCtx>({
  theme:      'light',
  setTheme:   () => {},
  themeLabel: '라이트',
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('moto:theme') as Theme
    return (['light', 'navy', 'warm'] as Theme[]).includes(saved) ? saved : 'light'
  })

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('moto:theme', t)
  }

  const applyTheme = (t: Theme) => {
    const root = document.documentElement
    // 모든 테마 클래스 제거
    Object.values(CLASS_MAP).forEach(c => { if (c) root.classList.remove(c) })
    // 새 테마 클래스 추가 (light는 빈 문자열 → 아무것도 안 붙임)
    if (CLASS_MAP[t]) root.classList.add(CLASS_MAP[t])
  }

  useEffect(() => { applyTheme(theme) }, [theme])

  // 최초 마운트 시 복원
  useEffect(() => { applyTheme(theme) }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Ctx.Provider value={{ theme, setTheme, themeLabel: THEME_LABEL[theme] }}>
      {children}
    </Ctx.Provider>
  )
}

export const useTheme = () => useContext(Ctx)
