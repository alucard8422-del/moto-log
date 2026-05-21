// BadgeGrid.tsx — 프로필 > 업적 배지 그리드
// 배지 UI 수정 시 이 파일만 건드리면 됩니다.

import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { BADGES, TIER_STYLES, type Tier } from '../../constants/BadgesData'

// ── 배지 달성 티어 계산 ─────────────────────────────────────────────────────
export function getEarnedTier(badgeId: string): Tier | null {
  const badge = BADGES.find(b => b.id === badgeId)
  if (!badge) return null

  if (badge.isEvent) {
    return localStorage.getItem(`moto:badge:${badgeId}`) === '1'
      ? (badge.isHidden ? 'PLATINUM' : 'GOLD')
      : null
  }

  const val = parseInt(localStorage.getItem(`moto:badge:${badgeId}`) ?? '0')
  if (val >= badge.thresholds.PLATINUM) return 'PLATINUM'
  if (val >= badge.thresholds.GOLD)     return 'GOLD'
  if (val >= badge.thresholds.SILVER)   return 'SILVER'
  if (val >= badge.thresholds.BRONZE)   return 'BRONZE'
  return null
}

interface Props {
  onBadgePress: (badgeId: string, tier: Tier) => void
}

export default function BadgeGrid({ onBadgePress }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const earnedCount = BADGES.filter(b => getEarnedTier(b.id) !== null).length

  return (
    <div
      className="flex flex-col gap-4 rounded-[20px] p-5"
      style={{
        background:           'var(--glass-bg)',
        backdropFilter:       'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border:               '1px solid var(--glass-border)',
        boxShadow:            'var(--glass-shadow)',
      }}
    >
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={14} strokeWidth={1.5} className="text-amber-500" />
          <span className="text-sm font-bold text-main">나의 업적 배지</span>
        </div>
        <div
          className="flex items-center gap-1 rounded-full px-3 py-1"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <span className="text-xs font-bold text-brand">{earnedCount}</span>
          <span className="text-[10px] text-muted">/ {BADGES.length}</span>
        </div>
      </div>

      {/* 4열 그리드 */}
      <div className="grid grid-cols-4 gap-3">
        {BADGES.map(badge => {
          const Icon           = badge.icon
          const tier           = getEarnedTier(badge.id)
          const style          = tier ? TIER_STYLES[tier] : null
          const isHiddenLocked = badge.isHidden && !tier

          return (
            <button
              key={badge.id}
              onClick={() => {
                setSelected(prev => prev === badge.id ? null : badge.id)
                if (tier) onBadgePress(badge.id, tier)
              }}
              className="flex flex-col items-center gap-1.5 transition-transform duration-200 active:scale-90"
              style={!tier && !isHiddenLocked ? { opacity: 0.25, filter: 'grayscale(100%)' } : undefined}
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${style ? `${style.bg} ${style.border}` : ''}`}
                style={{
                  ...(style ? { boxShadow: style.glow } : {}),
                  ...(!style ? { background: 'var(--bg-elevated)', border: '1px solid var(--border)' } : {}),
                }}
              >
                {isHiddenLocked ? (
                  <span className="text-xl font-bold text-muted">?</span>
                ) : (
                  <Icon size={26} strokeWidth={1.3} className={style ? style.text : 'text-muted'} />
                )}
              </div>

              <span className={`text-center text-[9px] leading-tight ${style ? 'font-medium text-sub' : 'font-normal text-muted'}`}>
                {isHiddenLocked ? '???' : badge.name}
              </span>

              {tier && style && (
                <span className={`text-[8px] font-bold tracking-wider ${style.text}`}>{tier}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* 선택된 배지 달성 조건 툴팁 */}
      {selected && (() => {
        const badge = BADGES.find(b => b.id === selected)
        if (!badge) return null
        const tier  = getEarnedTier(badge.id)
        const style = tier ? TIER_STYLES[tier] : null
        return (
          <div
            className={`rounded-[20px] p-4 transition-all duration-300 ${style ? `${style.bg} ${style.border}` : ''}`}
            style={!style ? { background: 'var(--bg-elevated)', border: '1px solid var(--border)' } : undefined}
          >
            <p className={`mb-1 text-[11px] font-bold ${style ? style.text : 'text-muted'}`}>
              {badge.name} {tier ? `— ${tier}` : '(미달성)'}
            </p>
            <p className="mb-2 text-[10px] text-muted">{badge.description}</p>
            <div className="flex gap-3">
              {(['BRONZE','SILVER','GOLD','PLATINUM'] as Tier[]).map(t => (
                <div key={t} className="flex flex-col items-center gap-0.5">
                  <span className={`text-[9px] font-bold ${TIER_STYLES[t].text} ${tier === t ? '' : 'opacity-40'}`}>{t[0]}</span>
                  <span className="text-[9px] text-muted">{badge.thresholds[t]}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
