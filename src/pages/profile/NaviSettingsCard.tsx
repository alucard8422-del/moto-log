// NaviSettingsCard.tsx — 프로필 > 내비게이션 설정 카드 (인라인)
// 내비 선택 UI 수정 시 이 파일만 건드리면 됩니다.

import { Check } from 'lucide-react'
import { NAVI_OPTIONS, NAVI_STORAGE_KEY, type NavigationType } from '../map/types'
import { checkAndUnlockNaviBadge } from '../../components/BadgeAchievementModal'
import type { Tier } from '../../data/BadgesData'

interface Props {
  naviType:   NavigationType
  onChange:   (type: NavigationType) => void
  onBadges:   (queue: Array<{ badgeId: string; tier: Tier }>) => void
}

export default function NaviSettingsCard({ naviType, onChange, onBadges }: Props) {
  const handleSelect = (type: NavigationType) => {
    onChange(type)
    localStorage.setItem(NAVI_STORAGE_KEY, type)
    const { newlyUnlocked } = checkAndUnlockNaviBadge(type as 'tmap' | 'kakao' | 'atlan')
    if (newlyUnlocked.length > 0) onBadges(newlyUnlocked)
  }

  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <p className="mb-3 text-[10px] font-light uppercase tracking-widest text-white/30">
        내비게이션 설정
      </p>
      <div className="flex flex-col gap-2">
        {NAVI_OPTIONS.map((opt) => {
          const active = naviType === opt.type
          return (
            <button
              key={opt.type}
              onClick={() => handleSelect(opt.type)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-150 ${
                active ? 'bg-teal-400/10 ring-1 ring-teal-400/40' : 'bg-white/5'
              }`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black ${
                active ? 'bg-teal-400 text-slate-950' : 'bg-white/10 text-white/50'
              }`}>
                {opt.badge}
              </div>
              <span className={`flex-1 text-left text-sm font-semibold ${
                active ? 'text-teal-400' : 'text-white/70'
              }`}>
                {opt.label}
              </span>
              {active && <Check size={14} strokeWidth={2.5} className="text-teal-400" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
