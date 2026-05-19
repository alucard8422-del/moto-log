// naviUtils.ts — 내비게이션 앱 연동 유틸리티
// T맵 / 카카오내비 / 아틀란 연동 수정 시 이 파일만 건드리면 됩니다.

import { NAVI_STORAGE_KEY, type NavigationType } from './types'

// ── 앱 스킴 URL (앱 실행만, 검색 없음) ──────────────────────────────────
const NAVI_SCHEMES: Record<NavigationType, string> = {
  tmap:  'tmap://',
  kakao: 'kakaonavi://',
  atlan: 'atlan://',
}

// ── 저장된 내비 설정 불러오기 ────────────────────────────────────────────
export function loadNaviPref(): NavigationType {
  return (localStorage.getItem(NAVI_STORAGE_KEY) as NavigationType) ?? 'tmap'
}

// ── 내비 앱 실행 ─────────────────────────────────────────────────────────
export function launchNavi(type: NavigationType) {
  window.location.href = NAVI_SCHEMES[type]
}
