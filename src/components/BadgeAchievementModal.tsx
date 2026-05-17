// BadgeAchievementModal.tsx — 배지 달성 축하 팝업 + canvas-confetti 폭죽
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { X } from 'lucide-react'
import {
  BADGES, TIER_STYLES, NAVI_BADGE_MAP, HIDDEN_NAVI_BADGE_ID,
  RIDE_DIARY_BADGE_ID,
  type Tier, type BadgeDef,
} from '../data/BadgesData'

// ── 내비게이션 배지 달성 체크 & 연쇄 해금 로직 ─────────────────────────────
export interface NaviBadgeUnlockResult {
  // 이번 선택으로 새롭게 달성된 배지 목록 (없으면 빈 배열)
  newlyUnlocked: Array<{ badgeId: string; tier: Tier }>
}

/**
 * 내비게이션 타입 변경 시 호출 — localStorage에 배지 달성값 기록 후
 * 히든 배지(navi-collector) 연쇄 조건 충족 여부까지 검사해 반환
 */
export function checkAndUnlockNaviBadge(
  naviType: 'tmap' | 'kakao' | 'atlan',
): NaviBadgeUnlockResult {
  const result: NaviBadgeUnlockResult = { newlyUnlocked: [] }
  const badgeId = NAVI_BADGE_MAP[naviType]
  const key     = `moto:badge:${badgeId}`

  // 이미 달성된 배지는 재발화하지 않음
  if (localStorage.getItem(key) !== '1') {
    localStorage.setItem(key, '1')
    result.newlyUnlocked.push({ badgeId, tier: 'GOLD' })
  }

  // 히든 배지 연쇄 조건 체크 — 3종 모두 달성됐는지 확인
  const hiddenKey    = `moto:badge:${HIDDEN_NAVI_BADGE_ID}`
  const alreadyHidden = localStorage.getItem(hiddenKey) === '1'
  if (!alreadyHidden) {
    const allUnlocked = Object.values(NAVI_BADGE_MAP).every(
      id => localStorage.getItem(`moto:badge:${id}`) === '1',
    )
    if (allUnlocked) {
      localStorage.setItem(hiddenKey, '1')
      // 히든 배지는 PLATINUM 꽃가루 연출
      result.newlyUnlocked.push({ badgeId: HIDDEN_NAVI_BADGE_ID, tier: 'PLATINUM' })
    }
  }

  return result
}

interface Props {
  badge:   BadgeDef
  tier:    Tier
  isOpen:  boolean
  onClose: () => void
}

// ── 티어 계산 헬퍼 (BadgeDef + 값 → Tier) ────────────────────────────────
function tierForValue(badge: BadgeDef, val: number): Tier | null {
  if (val >= badge.thresholds.PLATINUM) return 'PLATINUM'
  if (val >= badge.thresholds.GOLD)     return 'GOLD'
  if (val >= badge.thresholds.SILVER)   return 'SILVER'
  if (val >= badge.thresholds.BRONZE)   return 'BRONZE'
  return null
}

/**
 * 주행 기록 저장 시 호출 — 누적 카운트를 1 증가시키고
 * 새로운 티어가 달성됐으면 해당 배지를 반환 (꽃가루 팝업 트리거용)
 */
export function checkRideDiaryBadge(): NaviBadgeUnlockResult {
  const badge = BADGES.find(b => b.id === RIDE_DIARY_BADGE_ID)
  if (!badge) return { newlyUnlocked: [] }

  const key  = `moto:badge:${RIDE_DIARY_BADGE_ID}`
  const prev = parseInt(localStorage.getItem(key) ?? '0')
  const next = prev + 1
  localStorage.setItem(key, String(next))

  const prevTier = tierForValue(badge, prev)
  const nextTier = tierForValue(badge, next)

  // 티어가 새로 바뀐 경우만 팝업 트리거
  if (nextTier && nextTier !== prevTier) {
    return { newlyUnlocked: [{ badgeId: RIDE_DIARY_BADGE_ID, tier: nextTier }] }
  }
  return { newlyUnlocked: [] }
}

// ── 꽃가루 이펙트 ─────────────────────────────────────────────────────────
function fireConfetti(colors: string[]) {
  // 중앙 폭죽 (첫 발사)
  confetti({
    particleCount: 120,
    spread:        90,
    origin:        { x: 0.5, y: 0.55 },
    colors,
    startVelocity: 45,
    gravity:       0.9,
    ticks:         220,
    scalar:        1.1,
  })

  // 좌측 사이드 폭죽
  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle:         60,
      spread:        55,
      origin:        { x: 0, y: 0.65 },
      colors,
      startVelocity: 50,
      gravity:       0.85,
    })
  }, 150)

  // 우측 사이드 폭죽
  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle:         120,
      spread:        55,
      origin:        { x: 1, y: 0.65 },
      colors,
      startVelocity: 50,
      gravity:       0.85,
    })
  }, 250)

  // PLATINUM 전용 — 별 모양 + 2차 웨이브
  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread:        100,
      origin:        { x: 0.5, y: 0.4 },
      colors,
      shapes:        ['star'],
      scalar:        1.3,
      startVelocity: 30,
      ticks:         300,
    })
  }, 400)
}

// ── 팝업 컴포넌트 ─────────────────────────────────────────────────────────
export default function BadgeAchievementModal({ badge, tier, isOpen, onClose }: Props) {
  const style    = TIER_STYLES[tier]
  const Icon     = badge.icon
  const firedRef = useRef(false)

  useEffect(() => {
    if (!isOpen) { firedRef.current = false; return }
    if (firedRef.current) return
    firedRef.current = true
    // 팝업 마운트 직후 꽃가루 발사
    const t = setTimeout(() => fireConfetti(style.confetti), 50)
    return () => clearTimeout(t)
  }, [isOpen, style.confetti])

  // body 스크롤 차단
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 어두운 배경 — 페이드인 */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />

          {/* 슬라이드업 팝업 패널 */}
          <motion.div
            key="panel"
            className="fixed bottom-0 inset-x-0 z-[160] flex justify-center"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            <div className="w-full max-w-sm rounded-t-3xl border border-white/10 bg-[#0D1117]/98 px-6 pt-5 pb-12 backdrop-blur-2xl">
              {/* 핸들 바 */}
              <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/20" />

              {/* 닫기 */}
              <button
                onClick={onClose}
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40 active:opacity-60"
              >
                <X size={14} strokeWidth={1.5} />
              </button>

              {/* 상단 라벨 */}
              <p className="mb-4 text-center text-[10px] font-light uppercase tracking-widest text-white/30">
                🎉 배지 달성
              </p>

              {/* 배지 아이콘 — 티어 색상 링 + 글로우 */}
              <div className="flex flex-col items-center gap-4">
                <div
                  className={`flex h-24 w-24 items-center justify-center rounded-full ${style.bg} ${style.border}`}
                  style={{ boxShadow: style.glow }}
                >
                  <Icon size={44} strokeWidth={1.2} className={style.text} />
                </div>

                {/* 티어 뱃지 */}
                <div
                  className={`rounded-full px-4 py-1 text-xs font-bold tracking-widest ${style.bg} ${style.text}`}
                  style={{ boxShadow: style.glow }}
                >
                  {tier}
                </div>

                {/* 배지 이름 */}
                <p className="text-xl font-bold text-white">{badge.name}</p>

                {/* 메인 문구 */}
                <p className="text-center text-sm font-light leading-relaxed text-white/50">
                  <span className={`font-bold ${style.text}`}>[{badge.name}]</span>의{' '}
                  <span className={`font-bold ${style.text}`}>{tier}</span> 등급을<br />
                  달성하셨습니다!
                </p>

                {/* 설명 */}
                <p className="text-center text-[11px] font-light text-white/25">
                  {badge.description}
                </p>
              </div>

              {/* 확인 버튼 */}
              <button
                onClick={onClose}
                className={`mt-8 flex w-full items-center justify-center rounded-2xl py-4 text-sm font-bold text-slate-950 transition-opacity active:opacity-80 ${
                  tier === 'PLATINUM' ? 'bg-[#2DD4BF]'
                  : tier === 'GOLD'   ? 'bg-[#FFD700]'
                  : tier === 'SILVER' ? 'bg-[#C0C0C0]'
                  : 'bg-[#CD7F32]'
                }`}
              >
                멋진데요! 계속 달려볼게요 🏍️
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
