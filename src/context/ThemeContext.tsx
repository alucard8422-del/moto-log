// ThemeContext.tsx — 앱 전역 테마 상태 관리
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Theme = 'dark' | 'light' | 'white'

// HTML root에 적용할 CSS 클래스 (index.css와 1:1 대응)
const CLASS_MAP: Record<Theme, string> = {
  dark:  'theme-dark',
  light: 'theme-light',
  white: 'theme-white',
}

export const THEME_LABEL: Record<Theme, string> = {
  dark:  '다크',
  light: '라이트',
  white: '화이트',
}

interface ThemeCtx {
  theme:      Theme
  setTheme:   (t: Theme) => void
  themeLabel: string
}

const Ctx = createContext<ThemeCtx>({
  theme:      'dark',
  setTheme:   () => {},
  themeLabel: '다크',
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('moto:theme') as Theme) ?? 'dark'
  })

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('moto:theme', t)
  }

  // 테마 변경 시 <html> 클래스 즉시 교체 → CSS 변수 전체 적용
  useEffect(() => {
    const root = document.documentElement
    Object.values(CLASS_MAP).forEach(c => root.classList.remove(c))
    root.classList.add(CLASS_MAP[theme])
  }, [theme])

  // 앱 최초 마운트 시 저장된 테마 클래스 복원
  useEffect(() => {
    const root = document.documentElement
    Object.values(CLASS_MAP).forEach(c => root.classList.remove(c))
    root.classList.add(CLASS_MAP[theme])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Ctx.Provider value={{ theme, setTheme, themeLabel: THEME_LABEL[theme] }}>
      {children}
    </Ctx.Provider>
  )
}

export const useTheme = () => useContext(Ctx)
