/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ── 디자인 토큰 → Tailwind 배경색 ─────────────────────────────────────
      // bg-app        : 전체 페이지 배경
      // bg-surface    : 카드·시트·모달 배경
      // bg-elevated   : 버튼·칩·입력창 배경
      // bg-brand      : 브랜드 포인트 배경
      // bg-brand-soft : 연한 브랜드 배경 (아이콘 뒤 배경 등)
      backgroundColor: {
        app:          'var(--bg-app)',
        surface:      'var(--bg-surface)',
        elevated:     'var(--bg-elevated)',
        brand:        'var(--brand)',
        'brand-soft': 'var(--brand-soft)',
        accent:       'var(--brand-accent)',   // 하위 호환
      },

      // ── 디자인 토큰 → Tailwind 텍스트색 ───────────────────────────────────
      // text-main   : 제목·메인 텍스트
      // text-sub    : 본문·설명 텍스트
      // text-muted  : 힌트·날짜·비활성
      // text-brand  : 포인트 강조
      textColor: {
        main:   'var(--text-main)',
        sub:    'var(--text-sub)',
        muted:  'var(--text-muted)',
        brand:  'var(--brand)',
        accent: 'var(--brand-accent)',   // 하위 호환
      },

      // ── 디자인 토큰 → Tailwind 테두리색 ───────────────────────────────────
      // border-default : 일반 구분선
      // border-brand   : 포인트 테두리
      borderColor: {
        default: 'var(--border)',
        brand:   'var(--brand)',
        line:    'var(--border-line)',   // 하위 호환
        accent:  'var(--brand-accent)', // 하위 호환
      },

      // ── Ring ───────────────────────────────────────────────────────────────
      ringColor: {
        brand:  'var(--brand)',
        accent: 'var(--brand-accent)',   // 하위 호환
      },

      // ── 폰트 ───────────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
