// ProfilePage.tsx — 프로필 메뉴 메인 (상태 관리 + 레이아웃)
// UI 수정 → src/pages/profile/ 각 파일 / 로직 수정 → 이 파일
import { useState, useEffect } from 'react'
import { useNavigate }                from 'react-router-dom'
import { Settings, Gauge, LogOut, FlaskConical } from 'lucide-react'

// ── profile/ 서브 컴포넌트 ────────────────────────────────────────────────
import BadgeGrid                      from './profile/BadgeGrid'
import NaviSettingsCard               from './profile/NaviSettingsCard'
import SavedTab                       from './profile/SavedTab'

// ── 공용 컴포넌트·서비스 ──────────────────────────────────────────────────
import BadgeAchievementModal from '../components/BadgeAchievementModal'
import GarageEditModal, { type GarageData } from './garage/GarageEditModal'
import FuelLogTab                     from '../components/FuelLogTab'
import FuelConfirmPopup               from '../components/FuelConfirmPopup'
import { fetchProfile, upsertProfile } from '../lib/profileService'
import { useFuel }                    from '../context/FuelContext'
import { NAVI_STORAGE_KEY, type NavigationType } from './map/types'
import { BADGES, type Tier }          from '../constants/BadgesData'

type Tab = 'garage' | 'saved' | 'fuel'

export default function ProfilePage() {
  const navigate             = useNavigate()
  const { triggerFuelPopup } = useFuel()

  const [naviType, setNaviType] = useState<NavigationType>(
    () => (localStorage.getItem(NAVI_STORAGE_KEY) as NavigationType) ?? 'tmap'
  )
  const [garage, setGarage] = useState<GarageData>({
    bikeModel:        'Honda CB500F',
    totalKm:          12340,
    ridingHours:      '48h',
    completedCourses: 12,
  })
  const [editOpen,   setEditOpen]   = useState(false)
  const [activeTab,  setActiveTab]  = useState<Tab>('garage')

  // 배지 달성 팝업 큐
  const [badgeQueue, setBadgeQueue] = useState<Array<{ badgeId: string; tier: Tier }>>([])
  const currentPopup = badgeQueue[0] ?? null
  const dismissPopup = () => setBadgeQueue(prev => prev.slice(1))
  const handleBadgePress = (badgeId: string, tier: Tier) =>
    setBadgeQueue([{ badgeId, tier }])

  useEffect(() => {
    fetchProfile().then(data => { if (data) setGarage(data) })
  }, [])

  const handleSave = (next: GarageData) => {
    setGarage(next)
    upsertProfile(next).then(ok => {
      if (!ok) console.warn('[ProfilePage] 서버 저장 실패 — 로컬에만 반영됨')
    })
  }

  const handleLogout = () => console.log('[ProfilePage] 로그아웃 클릭')

  // ── 탭 레이블 정의 ───────────────────────────────────────────────────────
  const TABS: [Tab, string][] = [
    ['garage', '마이 가라지'],
    ['saved',  '저장 코스'],
    ['fuel',   '주유 기록'],
  ]

  return (
    <div className="flex flex-col gap-7 px-4 pt-6 pb-8">

      {/* ── 상단 프로필 헤더 ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-400/10">
              <span className="text-2xl font-bold text-teal-400">H</span>
            </div>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-950 bg-teal-400" />
          </div>
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
          { value: garage.ridingHours,              label: '라이딩 시간' },
          { value: String(garage.completedCourses), label: '완주 코스' },
        ].map(({ value, label }) => (
          <div key={label} className="flex flex-col gap-1 rounded-2xl bg-white/5 py-4">
            <span className="text-lg font-bold text-white">{value}</span>
            <span className="text-[10px] font-light text-white/35">{label}</span>
          </div>
        ))}
      </div>

      {/* ── 탭 스위처 (3탭) ── */}
      <div className="flex rounded-2xl bg-white/5 p-1">
        {TABS.map(([key, label]) => (
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

      {/* ── 마이 가라지 탭 ── */}
      {activeTab === 'garage' && <>
        {/* My Garage 요약 헤더 */}
        <div className="flex items-center justify-between rounded-2xl bg-white/5 px-5 py-3">
          <div>
            <p className="text-[10px] font-light uppercase tracking-widest text-white/25">
              My Garage
            </p>
            <p className="text-sm font-bold text-white">{garage.bikeModel}</p>
          </div>
          <div className="flex items-baseline gap-1">
            <Gauge size={13} strokeWidth={1.5} className="text-teal-400" />
            <span className="text-xl font-bold text-white">
              {garage.totalKm.toLocaleString()}
            </span>
            <span className="text-[10px] font-light text-white/30">km</span>
          </div>
        </div>

        {/* 업적 배지 */}
        <BadgeGrid onBadgePress={handleBadgePress} />

        {/* 내비 설정 */}
        <NaviSettingsCard
          naviType={naviType}
          onChange={setNaviType}
          onBadges={setBadgeQueue}
        />

        {/* 가라지 편집 모달 */}
        {editOpen && (
          <GarageEditModal
            data={garage}
            onClose={() => setEditOpen(false)}
            onSave={handleSave}
          />
        )}

        {/* 로그아웃 */}
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

      {/* ── 저장 코스 탭 ── */}
      {activeTab === 'saved' && <SavedTab />}

      {/* ── 주유 기록 탭 ── */}
      {activeTab === 'fuel' && <>
        <FuelLogTab />

        {/* ─────────────────────────────────────────────────────
            [임시 테스트] 주유 팝업 트리거 버튼
            이 메뉴는 테스트 이후 삭제될 예정입니다.
        ───────────────────────────────────────────────────── */}
        <button
          onClick={() =>
            triggerFuelPopup({
              storeName:  'GS칼텍스 테스트점',
              amount:     45000,
              receivedAt: new Date(),
            })
          }
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 py-3 text-xs font-light text-white/25 transition-opacity active:opacity-60"
        >
          <FlaskConical size={12} strokeWidth={1.5} />
          주유 팝업 테스트 (삭제 예정)
        </button>
      </>}

      <FuelConfirmPopup />

      {/* 배지 달성 팝업 큐 */}
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
