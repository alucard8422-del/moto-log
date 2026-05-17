import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import mopedBase from '../assets/images/moped_base.png'
import { Settings, Gauge, LogOut, FlaskConical, Check, Trophy, Zap, ChevronRight } from 'lucide-react'
import { BIKE_LINEUP, LP_KEY, OWNED_BIKES_KEY } from '../data/VehicleShopData'
import { BADGES, TIER_STYLES, type Tier } from '../data/BadgesData'
import BadgeAchievementModal, { checkAndUnlockNaviBadge } from '../components/BadgeAchievementModal'
import { NAVI_OPTIONS, NAVI_STORAGE_KEY, type NavigationType } from './map/types'
import GarageEditModal, { type GarageData } from '../components/GarageEditModal'
import { fetchProfile, upsertProfile } from '../lib/profileService'
import FuelLogTab from '../components/FuelLogTab'
import FuelConfirmPopup from '../components/FuelConfirmPopup'
import { useFuel } from '../context/FuelContext'

type Tab = 'garage' | 'fuel'

// ── 배지 달성 티어 계산 (localStorage 기반) ───────────────────────────────
function getEarnedTier(badgeId: string): Tier | null {
  const badge = BADGES.find(b => b.id === badgeId)
  if (!badge) return null

  if (badge.isEvent) {
    // 이벤트 배지: '1' 저장 시 달성 — 히든이면 PLATINUM, 일반이면 GOLD
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

// ── 배지 그리드 섹션 ─────────────────────────────────────────────────────
function BadgeGrid({
  onBadgePress,
}: {
  onBadgePress: (badgeId: string, tier: Tier) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)

  const earnedCount = BADGES.filter(b => getEarnedTier(b.id) !== null).length

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-white/5 p-5">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={14} strokeWidth={1.5} className="text-amber-400" />
          <span className="text-sm font-bold text-white">나의 업적 배지</span>
        </div>
        {/* 획득 / 전체 카운트 */}
        <div className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-1">
          <span className="text-xs font-bold text-teal-400">{earnedCount}</span>
          <span className="text-[10px] font-light text-white/30">/ {BADGES.length}</span>
        </div>
      </div>

      {/* 4열 그리드 */}
      <div className="grid grid-cols-4 gap-3">
        {BADGES.map(badge => {
          const Icon   = badge.icon
          const tier   = getEarnedTier(badge.id)
          const style  = tier ? TIER_STYLES[tier] : null
          // 히든 배지: 미달성 시 ? 아이콘으로만 표시 (이름도 숨김)
          const isHiddenLocked = badge.isHidden && !tier

          return (
            <button
              key={badge.id}
              onClick={() => {
                setSelected(prev => prev === badge.id ? null : badge.id)
                if (tier) onBadgePress(badge.id, tier)
              }}
              className={`flex flex-col items-center gap-1.5 transition-transform duration-200 active:scale-90 ${
                !tier && !isHiddenLocked ? 'opacity-40 grayscale' : ''
              }`}
            >
              {/* 아이콘 원형 */}
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                  style             ? `${style.bg} ${style.border}`
                  : isHiddenLocked ? 'bg-white/5 ring-1 ring-dashed ring-white/20'
                  : 'bg-white/5 ring-1 ring-white/10'
                }`}
                style={style ? { boxShadow: style.glow } : undefined}
              >
                {isHiddenLocked ? (
                  // 히든 미달성: ? 표시
                  <span className="text-xl font-bold text-white/20">?</span>
                ) : (
                  <Icon size={26} strokeWidth={1.3} className={style ? style.text : 'text-white/30'} />
                )}
              </div>

              {/* 배지 이름 — 히든 미달성은 ??? */}
              <span className={`text-center text-[9px] font-light leading-tight ${
                style ? 'text-white/70' : 'text-white/25'
              }`}>
                {isHiddenLocked ? '???' : badge.name}
              </span>

              {/* 티어 라벨 */}
              {tier && style && (
                <span className={`text-[8px] font-bold tracking-wider ${style.text}`}>
                  {tier}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 선택된 배지 달성 조건 툴팁 */}
      {selected && (() => {
        const badge = BADGES.find(b => b.id === selected)
        if (!badge) return null
        const tier = getEarnedTier(badge.id)
        const style = tier ? TIER_STYLES[tier] : null
        return (
          <div className={`rounded-2xl border p-3.5 transition-all duration-300 ${
            style ? `border-white/10 ${style.bg}` : 'border-white/5 bg-white/[0.03]'
          }`}>
            <p className={`mb-1 text-[11px] font-bold ${style ? style.text : 'text-white/40'}`}>
              {badge.name} {tier ? `— ${tier}` : '(미달성)'}
            </p>
            <p className="mb-2 text-[10px] font-light text-white/40">{badge.description}</p>
            {/* 티어별 달성 기준 */}
            <div className="flex gap-3">
              {(['BRONZE','SILVER','GOLD','PLATINUM'] as Tier[]).map(t => (
                <div key={t} className="flex flex-col items-center gap-0.5">
                  <span className={`text-[9px] font-bold ${TIER_STYLES[t].text} ${
                    tier === t ? '' : 'opacity-40'
                  }`}>{t[0]}</span>
                  <span className="text-[9px] font-light text-white/30">
                    {badge.thresholds[t]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── 50cc 도트 그래픽 바이크 이미지 ──────────────────────────────────────────
// moped_base.png: src/assets/images/ 에서 import
// image-rendering: pixelated → 픽셀 경계가 뭉개지지 않고 선명하게 유지
function PixelBike50cc() {
  return (
    <img
      src={mopedBase}
      alt="50cc 스쿠터"
      style={{ imageRendering: 'pixelated' }}
      className="h-36 w-auto object-contain drop-shadow-lg"
      draggable={false}
    />
  )
}

// ── 정비소 감성 바이크 업그레이드 상점 ───────────────────────────────────
function GarageShop() {
  const [lp, setLp] = useState(() =>
    parseInt(localStorage.getItem(LP_KEY) ?? '100')
  )
  const [ownedCcs, setOwnedCcs] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(OWNED_BIKES_KEY) ?? '[50]') }
    catch { return [50] }
  })

  const currentCc  = Math.max(...ownedCcs)
  const currentBike = BIKE_LINEUP.find(b => b.cc === currentCc) ?? BIKE_LINEUP[0]
  const nextBike    = BIKE_LINEUP.find(b => b.cc > currentCc)
  const canUpgrade  = !!nextBike && lp >= nextBike.cost

  const handleUpgrade = () => {
    if (!nextBike || !canUpgrade) return
    const newLp     = lp - nextBike.cost
    const newOwned  = [...ownedCcs, nextBike.cc]
    setLp(newLp)
    setOwnedCcs(newOwned)
    localStorage.setItem(LP_KEY, String(newLp))
    localStorage.setItem(OWNED_BIKES_KEY, JSON.stringify(newOwned))
  }

  // 진행도 dot 인디케이터
  const totalSteps = BIKE_LINEUP.length
  const doneSteps  = ownedCcs.length

  return (
    <div className="overflow-hidden rounded-3xl border border-white/5">
      {/* ── 정비소 배경 영역 ── */}
      <div
        className="relative flex h-52 flex-col items-center justify-end"
        style={{
          background: 'linear-gradient(180deg,#060A12 0%,#0A1220 55%,#0D1828 100%)',
          backgroundImage:
            'linear-gradient(rgba(45,212,191,0.04) 1px,transparent 1px),' +
            'linear-gradient(90deg,rgba(45,212,191,0.04) 1px,transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      >
        {/* 천장 형광등 */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-4">
          <div className="h-1.5 w-20 rounded-full bg-teal-400/30"
            style={{ boxShadow: '0 0 12px 4px rgba(45,212,191,0.15)' }} />
          <div className="h-1.5 w-20 rounded-full bg-teal-400/30"
            style={{ boxShadow: '0 0 12px 4px rgba(45,212,191,0.15)' }} />
        </div>

        {/* 벽 선반 */}
        <div className="absolute top-10 inset-x-4 h-px bg-white/5" />

        {/* 바이크 라벨 */}
        <div className="absolute top-14 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
          <span className="rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-0.5 text-[10px] font-bold text-teal-400">
            {currentBike.cc}cc
          </span>
        </div>

        {/* 픽셀 아트 바이크 */}
        <div className="relative z-10 mb-2">
          <PixelBike50cc />
        </div>

        {/* 바닥 라인 */}
        <div className="absolute bottom-10 inset-x-0 h-px bg-teal-400/10" />
        {/* 바닥 그라데이션 */}
        <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-[#060A12]/80 to-transparent pointer-events-none" />

        {/* 테크트리 dot 인디케이터 */}
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
          {BIKE_LINEUP.map((b, i) => (
            <div
              key={b.cc}
              className={`rounded-full transition-all duration-300 ${
                i < doneSteps
                  ? 'h-1.5 w-4 bg-teal-400'
                  : 'h-1.5 w-1.5 bg-white/15'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── 하단 정보 + 업그레이드 버튼 ── */}
      <div className="flex flex-col gap-4 bg-[#0A1220] px-5 pb-5 pt-4">
        {/* 현재 바이크 + LP */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-light uppercase tracking-widest text-white/25">
              현재 바이크
            </p>
            <p className="text-sm font-bold text-white">{currentBike.name}</p>
            <p className="mt-0.5 text-[11px] font-light text-white/35">{currentBike.flavor}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-2xl border border-teal-400/20 bg-teal-400/5 px-3 py-2">
            <Zap size={12} strokeWidth={1.5} className="text-teal-400" />
            <span className="text-sm font-bold text-teal-400">{lp.toLocaleString()}</span>
            <span className="text-[9px] font-light text-white/30">LP</span>
          </div>
        </div>

        {/* 업그레이드 버튼 */}
        {nextBike ? (
          <button
            onClick={handleUpgrade}
            disabled={!canUpgrade}
            className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 transition-all duration-200 active:scale-[0.98] ${
              canUpgrade
                ? 'bg-teal-400 text-slate-950'
                : 'border border-white/8 bg-white/[0.03] text-white/25'
            }`}
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-[10px] font-light opacity-70">다음 단계</span>
              <span className="text-sm font-bold">
                {nextBike.cc}cc 업그레이드하기
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Zap size={11} strokeWidth={1.5} />
              <span className="text-xs font-bold">{nextBike.cost.toLocaleString()} LP</span>
              <ChevronRight size={14} strokeWidth={2} className="ml-1" />
            </div>
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-teal-400/20 py-3.5">
            <span className="text-sm font-bold text-teal-400">🏆 최고 등급 달성!</span>
          </div>
        )}

        {/* 진행 단계 텍스트 */}
        <p className="text-center text-[10px] font-light text-white/20">
          {doneSteps} / {totalSteps} 단계 해금 · {currentCc}cc 보유 중
        </p>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const navigate             = useNavigate()
  const { triggerFuelPopup } = useFuel()
  const [naviType, setNaviType] = useState<NavigationType>(
    () => (localStorage.getItem(NAVI_STORAGE_KEY) as NavigationType) ?? 'tmap'
  )

  const [garage, setGarage] = useState<GarageData>({
    bikeModel: 'Honda CB500F',
    totalKm: 12340,
    ridingHours: '48h',
    completedCourses: 12,
  })
  const [editOpen, setEditOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('garage')

  // 배지 달성 팝업 상태 — 큐 구조: 연쇄 달성(히든 포함) 순차 노출
  const [badgeQueue, setBadgeQueue]   = useState<Array<{ badgeId: string; tier: Tier }>>([])
  const currentPopup                  = badgeQueue[0] ?? null
  const dismissPopup                  = () => setBadgeQueue(prev => prev.slice(1))
  const handleBadgePress = (badgeId: string, tier: Tier) => setBadgeQueue([{ badgeId, tier }])

  useEffect(() => {
    fetchProfile().then((data) => {
      if (data) setGarage(data)
    })
  }, [])

  const handleSave = (next: GarageData) => {
    setGarage(next)
    upsertProfile(next).then((ok) => {
      if (!ok) console.warn('[ProfilePage] 서버 저장 실패 — 로컬에만 반영됨')
    })
  }

  const handleLogout = () => console.log('[ProfilePage] 로그아웃 클릭')

  return (
    <div className="flex flex-col gap-7 px-4 pt-6 pb-8">

      {/* ── 상단 프로필 ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* 아바타 */}
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-400/10">
              <span className="text-2xl font-bold text-teal-400">H</span>
            </div>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-950 bg-teal-400" />
          </div>

          {/* 텍스트 */}
          <div>
            <p className="text-lg font-bold text-white">Rider_Hong</p>
            <p className="mt-0.5 text-xs font-light text-white/35">
              2023년 4월부터 함께하는 라이더
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/settings')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 transition-opacity active:opacity-60"
        >
          <Settings size={15} strokeWidth={1.5} className="text-white/35" />
        </button>
      </div>

      {/* ── 주행 통계 3종 ── */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { value: garage.totalKm.toLocaleString(), label: '총 km' },
          { value: garage.ridingHours, label: '라이딩 시간' },
          { value: String(garage.completedCourses), label: '완주 코스' },
        ].map(({ value, label }) => (
          <div key={label} className="flex flex-col gap-1 rounded-2xl bg-white/5 py-4">
            <span className="text-lg font-bold text-white">{value}</span>
            <span className="text-[10px] font-light text-white/35">{label}</span>
          </div>
        ))}
      </div>

      {/* ── 탭 스위처 ── */}
      <div className="flex rounded-2xl bg-white/5 p-1">
        {([['garage', '마이 가라지'], ['fuel', '주유 기록']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 rounded-xl py-2 text-xs transition-all duration-200 ${
              activeTab === key
                ? 'bg-white/10 font-bold text-teal-400'
                : 'font-light text-white/40'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'fuel' && (
        <>
          <FuelLogTab />

          {/* ─────────────────────────────────────────────────────
              [임시 테스트] 주유 팝업 트리거 버튼
              이 메뉴는 테스트 이후 삭제될 예정입니다.
          ───────────────────────────────────────────────────── */}
          <button
            onClick={() =>
              triggerFuelPopup({
                storeName: 'GS칼텍스 테스트점',
                amount: 45000,
                receivedAt: new Date(),
              })
            }
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 py-3 text-xs font-light text-white/25 transition-opacity active:opacity-60"
          >
            <FlaskConical size={12} strokeWidth={1.5} />
            주유 팝업 테스트 (삭제 예정)
          </button>
        </>
      )}

      {activeTab === 'garage' && <>
      {/* ── 마이 가라지 헤더 (총 km 요약) ── */}
      <div className="flex items-center justify-between rounded-2xl bg-white/5 px-5 py-3">
        <div>
          <p className="text-[10px] font-light uppercase tracking-widest text-white/25">My Garage</p>
          <p className="text-sm font-bold text-white">{garage.bikeModel}</p>
        </div>
        <div className="flex items-baseline gap-1">
          <Gauge size={13} strokeWidth={1.5} className="text-teal-400" />
          <span className="text-xl font-bold text-white">{garage.totalKm.toLocaleString()}</span>
          <span className="text-[10px] font-light text-white/30">km</span>
        </div>
      </div>

      {/* ── 배기량 업그레이드 정비소 상점 ── */}
      <GarageShop />

      {/* ── 업적 배지 그리드 ── */}
      <BadgeGrid onBadgePress={handleBadgePress} />

      {/* ── [임시] 내비게이션 설정 ── */}
      <div className="rounded-2xl bg-white/5 p-4">
        <p className="mb-3 text-[10px] font-light uppercase tracking-widest text-white/30">
          내비게이션 설정 (임시)
        </p>
        <div className="flex flex-col gap-2">
          {NAVI_OPTIONS.map((opt) => {
            const active = naviType === opt.type
            return (
              <button
                key={opt.type}
                onClick={() => {
                  setNaviType(opt.type)
                  localStorage.setItem(NAVI_STORAGE_KEY, opt.type)
                  // 내비 선택 → 배지 달성 체크 & 히든 연쇄 해금
                  const { newlyUnlocked } = checkAndUnlockNaviBadge(opt.type as 'tmap' | 'kakao' | 'atlan')
                  if (newlyUnlocked.length > 0) setBadgeQueue(newlyUnlocked)
                }}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-150 ${active ? 'bg-teal-400/10 ring-1 ring-teal-400/40' : 'bg-white/5'}`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black ${active ? 'bg-teal-400 text-slate-950' : 'bg-white/10 text-white/50'}`}>
                  {opt.badge}
                </div>
                <span className={`flex-1 text-left text-sm font-semibold ${active ? 'text-teal-400' : 'text-white/70'}`}>
                  {opt.label}
                </span>
                {active && <Check size={14} strokeWidth={2.5} className="text-teal-400" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 가라지 편집 모달 ── */}
      {editOpen && (
        <GarageEditModal
          data={garage}
          onClose={() => setEditOpen(false)}
          onSave={handleSave}
        />
      )}

      {/* ── 로그아웃 ── */}
      <div className="flex justify-center pt-2">
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-light text-slate-500 transition-colors hover:text-slate-400"
        >
          <LogOut size={12} strokeWidth={1.5} />
          로그아웃
        </button>
      </div>
      </>}

      <FuelConfirmPopup />

      {/* 배지 달성 축하 팝업 — 큐 순차 노출 (히든 배지 연쇄 포함) */}
      {currentPopup && (() => {
        const badge = BADGES.find(b => b.id === currentPopup.badgeId)
        if (!badge) return null
        return (
          <BadgeAchievementModal
            badge={badge}
            tier={currentPopup.tier}
            isOpen={true}
            onClose={dismissPopup}
          />
        )
      })()}
    </div>
  )
}
