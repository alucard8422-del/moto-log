/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ── 기존 색상 ─────────────────────────────────────────────────────────
      colors: {
        teal: {
          400: '#2DD4BF',
        },
      },

      // ── 디자인 토큰 → Tailwind 배경색 클래스 ──────────────────────────────
      // bg-app      : 전체 도화지 배경
      // bg-surface  : 카드·모달·가라지 배경
      // bg-accent   : 포인트 버튼 배경
      backgroundColor: {
        app:     'var(--bg-app)',
        surface: 'var(--bg-surface)',
        accent:  'var(--brand-accent)',
      },

      // ── 디자인 토큰 → Tailwind 텍스트색 클래스 ────────────────────────────
      // text-main   : 메인 타이틀·본문
      // text-sub    : 서브·설명 텍스트
      // text-accent : 포인트 강조 텍스트
      textColor: {
        main:   'var(--text-main)',
        sub:    'var(--text-sub)',
        accent: 'var(--brand-accent)',
      },

      // ── 디자인 토큰 → Tailwind 테두리색 클래스 ────────────────────────────
      // border-line   : 카드·구분선 테두리
      // border-accent : 포인트 테두리
      borderColor: {
        line:   'var(--border-line)',
        accent: 'var(--brand-accent)',
      },

      // ── 디자인 토큰 → Tailwind Ring 색상 클래스 ───────────────────────────
      ringColor: {
        accent: 'var(--brand-accent)',
      },

      // ── 폰트 ─────────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
