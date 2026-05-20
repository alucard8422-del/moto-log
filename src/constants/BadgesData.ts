// BadgesData.ts — 배지 정의 + 티어 스타일 시스템
import {
  Milestone, Camera, Moon, Flame, Route, Star,
  Trophy, Zap, Wind, Coffee, Sunset, Mountain,
  Navigation2, MapPin, Crosshair, Gift,
  Key, PenLine, FolderHeart, BookOpen,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ── 티어 정의 ─────────────────────────────────────────────────────────────
export type Tier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'

export interface TierStyle {
  label:       string
  border:      string   // Tailwind ring/border class
  glow:        string   // box-shadow style value
  text:        string   // 텍스트 색상 class
  bg:          string   // 배경 tint class
  confetti:    string[] // 꽃가루 색상 팔레트
}

export const TIER_STYLES: Record<Tier, TierStyle> = {
  BRONZE: {
    label:    'BRONZE',
    border:   'ring-1 ring-[#CD7F32]',
    glow:     '0 0 12px rgba(205,127,50,0.5)',
    text:     'text-[#CD7F32]',
    bg:       'bg-[#CD7F32]/10',
    confetti: ['#CD7F32', '#8B4513', '#DEB887', '#F4A460', '#D2691E'],
  },
  SILVER: {
    label:    'SILVER',
    border:   'ring-1 ring-[#C0C0C0]',
    glow:     '0 0 14px rgba(192,192,192,0.55)',
    text:     'text-[#C0C0C0]',
    bg:       'bg-[#C0C0C0]/10',
    confetti: ['#C0C0C0', '#A8A8A8', '#E8E8E8', '#888888', '#D0D0D0'],
  },
  GOLD: {
    label:    'GOLD',
    border:   'ring-1 ring-[#FFD700]',
    glow:     '0 0 18px rgba(255,215,0,0.6)',
    text:     'text-[#FFD700]',
    bg:       'bg-[#FFD700]/10',
    confetti: ['#FFD700', '#FFA500', '#FF8C00', '#FFEC8B', '#DAA520'],
  },
  PLATINUM: {
    label:    'PLATINUM',
    border:   'ring-2 ring-[#FF5A00]',
    glow:     '0 0 24px rgba(255,90,0,0.7), 0 0 48px rgba(255,90,0,0.3)',
    text:     'text-[#FF5A00]',
    bg:       'bg-[#FF5A00]/10',
    confetti: ['#FF5A00', '#FF8C00', '#FFB347', '#EC4899', '#F59E0B', '#10B981'],
  },
}

// ── 배지 데이터 ────────────────────────────────────────────────────────────
export interface BadgeDef {
  id:           string
  name:         string
  description:  string
  icon:         LucideIcon
  thresholds:   Record<Tier, number>
  isEvent?:     boolean    // 1회성 이벤트 배지 — 달성값 '1'이면 GOLD
  isHidden?:    boolean    // 달성 전 ? 아이콘으로 숨김, 달성 시 PLATINUM
  unlocksWhen?: string[]  // 이 배지 ID 전부 달성 시 자동 해금 (히든 전용)
}

export const BADGES: BadgeDef[] = [
  {
    id:          'wanderer',
    name:        '길 위의 방랑자',
    description: '누적 주행 거리를 달성하면 등급이 오릅니다',
    icon:        Milestone,
    thresholds:  { BRONZE: 100, SILVER: 500, GOLD: 1500, PLATINUM: 5000 },
  },
  {
    id:          'photographer',
    name:        '인생샷 장인',
    description: '주행 일지에 사진을 등록한 횟수로 달성합니다',
    icon:        Camera,
    thresholds:  { BRONZE: 3, SILVER: 10, GOLD: 30, PLATINUM: 100 },
  },
  {
    id:          'nightrider',
    name:        '밤바리의 제왕',
    description: '야간(21시 이후) 주행 횟수로 달성합니다',
    icon:        Moon,
    thresholds:  { BRONZE: 5, SILVER: 20, GOLD: 60, PLATINUM: 150 },
  },
  {
    id:          'hotstreak',
    name:        '불꽃 라이더',
    description: '연속 주행일 수로 달성합니다',
    icon:        Flame,
    thresholds:  { BRONZE: 3, SILVER: 7, GOLD: 21, PLATINUM: 60 },
  },
  {
    id:          'longdistance',
    name:        '롱디 마스터',
    description: '단일 주행 최장 거리로 달성합니다',
    icon:        Route,
    thresholds:  { BRONZE: 100, SILVER: 300, GOLD: 600, PLATINUM: 1000 },
  },
  {
    id:          'reviewer',
    name:        '후기 장인',
    description: '주행 후기를 작성한 횟수로 달성합니다',
    icon:        Star,
    thresholds:  { BRONZE: 5, SILVER: 20, GOLD: 60, PLATINUM: 200 },
  },
  {
    id:          'champion',
    name:        '라이딩 챔피언',
    description: '총 주행 횟수로 달성합니다',
    icon:        Trophy,
    thresholds:  { BRONZE: 10, SILVER: 50, GOLD: 150, PLATINUM: 500 },
  },
  {
    id:          'speedster',
    name:        '질풍의 라이더',
    description: '최고 속도 기록(km/h)으로 달성합니다',
    icon:        Zap,
    thresholds:  { BRONZE: 80, SILVER: 110, GOLD: 140, PLATINUM: 160 },
  },
  {
    id:          'explorer',
    name:        '바람의 탐험가',
    description: '방문한 서로 다른 지역 수로 달성합니다',
    icon:        Wind,
    thresholds:  { BRONZE: 5, SILVER: 10, GOLD: 20, PLATINUM: 40 },
  },
  {
    id:          'cafehunter',
    name:        '카페 헌터',
    description: '카페 포함 코스 주행 횟수로 달성합니다',
    icon:        Coffee,
    thresholds:  { BRONZE: 3, SILVER: 10, GOLD: 30, PLATINUM: 100 },
  },
  {
    id:          'sunsetChaser',
    name:        '석양 추격자',
    description: '일몰 전후 1시간 내 주행 횟수로 달성합니다',
    icon:        Sunset,
    thresholds:  { BRONZE: 3, SILVER: 10, GOLD: 30, PLATINUM: 80 },
  },
  {
    id:          'mountaineer',
    name:        '산악 정복자',
    description: '고도 500m 이상 구간 통과 횟수로 달성합니다',
    icon:        Mountain,
    thresholds:  { BRONZE: 3, SILVER: 10, GOLD: 25, PLATINUM: 60 },
  },

  // ── 주행 기록 누적 4단계 배지 (단일 ID, 티어별 임계값 분기) ─────────────
  // BRONZE(1회) → SILVER(3회) → GOLD(7회) → PLATINUM(15회)
  // localStorage key: moto:badge:ride-diary (정수 누적)
  {
    id:          'ride-diary',
    name:        '첫 바퀴의 설렘',        // 표시 이름은 getEarnedTier 티어별로 오버라이드 가능
    description: '모토로그에 첫 발자국을 남기셨습니다. 위대한 여정의 시작!',
    icon:        Key,
    thresholds:  { BRONZE: 1, SILVER: 3, GOLD: 7, PLATINUM: 15 },
  },

  // ── 내비게이션 이벤트 배지 3종 ──────────────────────────────────────────
  {
    id:          'navi-tmap',
    name:        'T맵 사용자시군요!',
    description: '대한민국 국민 내비와 함께 주행을 시작합니다!',
    icon:        Navigation2,
    isEvent:     true,
    // 이벤트 배지는 값=1이면 GOLD — thresholds는 형식 유지용
    thresholds:  { BRONZE: 1, SILVER: 1, GOLD: 1, PLATINUM: 1 },
  },
  {
    id:          'navi-kakao',
    name:        '카카오내비 사용자시군요!',
    description: '노란색 카카오 프렌즈와 함께하는 경쾌한 라이딩!',
    icon:        MapPin,
    isEvent:     true,
    thresholds:  { BRONZE: 1, SILVER: 1, GOLD: 1, PLATINUM: 1 },
  },
  {
    id:          'navi-atlan',
    name:        '아틀란 네비 사용자시군요!',
    description: '바이크 전용 경로를 아시는 진정한 프로 라이더!',
    icon:        Crosshair,
    isEvent:     true,
    thresholds:  { BRONZE: 1, SILVER: 1, GOLD: 1, PLATINUM: 1 },
  },

  // ── 연쇄 달성 히든 배지 ─────────────────────────────────────────────────
  {
    id:           'navi-collector',
    name:         '이 많은 네비를 다 쓰시다니요!',
    description:  '혹시 내비게이션 수집가이신가요? 질릴 틈이 없는 길 찾기 마스터!',
    icon:         Gift,
    isEvent:      true,
    isHidden:     true,  // 달성 전 ? 아이콘으로 숨김
    unlocksWhen:  ['navi-tmap', 'navi-kakao', 'navi-atlan'], // 3종 모두 달성 시 자동 해금
    thresholds:   { BRONZE: 1, SILVER: 1, GOLD: 1, PLATINUM: 1 },
  },
]

// ── 주행 기록 배지 — 티어별 이름·설명·아이콘 오버라이드 ─────────────────
import type { LucideIcon as LI } from 'lucide-react'
export const RIDE_DIARY_BADGE_ID = 'ride-diary'
export const RIDE_DIARY_TIER_META: Record<Tier, {
  name:        string
  description: string
  icon:        LI
}> = {
  BRONZE: {
    name:        '첫 바퀴의 설렘',
    description: '모토로그에 첫 발자국을 남기셨습니다. 위대한 여정의 시작!',
    icon:        Key,
  },
  SILVER: {
    name:        '기록의 맛',
    description: '이제 주행 후 트랙을 남기는 재미를 알아버리셨군요!',
    icon:        PenLine,
  },
  GOLD: {
    name:        '모토로그 아카이브',
    description: '차곡차곡 쌓이는 나만의 라이딩 일기장, 든든합니다.',
    icon:        FolderHeart,
  },
  PLATINUM: {
    name:        '전설의 로드 다이어리',
    description: '기록이 곧 역사입니다. 당신의 모든 길을 모토로그가 기억합니다!',
    icon:        BookOpen,
  },
}

// ── 내비게이션 타입 → 배지 ID 매핑 ────────────────────────────────────────
export const NAVI_BADGE_MAP: Record<'tmap' | 'kakao' | 'atlan', string> = {
  tmap:  'navi-tmap',
  kakao: 'navi-kakao',
  atlan: 'navi-atlan',
}
export const HIDDEN_NAVI_BADGE_ID = 'navi-collector'
