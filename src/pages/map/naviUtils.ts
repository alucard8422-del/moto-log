// naviUtils.ts — 내비게이션 앱 연동 유틸리티
// T맵 / 카카오내비 / 아틀란 연동 수정 시 이 파일만 건드리면 됩니다.

import { NAVI_STORAGE_KEY, type NavigationType } from './types'

// ── 앱 스킴 URL ─────────────────────────────────────────────────────────
const NAVI_SCHEMES: Record<NavigationType, string> = {
  tmap:  'tmap://search?name=%ED%98%84%EC%9E%AC%EC%9C%84%EC%B9%98',
  kakao: 'kakaonavi://search?name=%ED%98%84%EC%9E%AC%EC%9C%84%EC%B9%98',
  atlan: 'atlan://search?name=%ED%98%84%EC%9E%AC%EC%9C%84%EC%B9%98',
}

// ── 앱 미설치 시 스토어 이동 URL ────────────────────────────────────────
const NAVI_STORE_FALLBACK: Record<NavigationType, string> = {
  tmap:  'https://apps.apple.com/kr/app/tmap/id431589174',
  kakao: 'https://apps.apple.com/kr/app/id668182711',
  atlan: 'https://apps.apple.com/kr/app/id681663516',
}

// ── 저장된 내비 설정 불러오기 ────────────────────────────────────────────
export function loadNaviPref(): NavigationType {
  return (localStorage.getItem(NAVI_STORAGE_KEY) as NavigationType) ?? 'tmap'
}

// ── 내비 앱 실행 (미설치 시 스토어로 이동) ─────────────────────────────
export function launchNavi(type: NavigationType) {
  window.location.href = NAVI_SCHEMES[type]
  setTimeout(() => {
    window.open(NAVI_STORE_FALLBACK[type], '_blank')
  }, 1500)
}
