import { useState, useEffect } from 'react'
import { Settings, Gauge, Wrench, LogOut, FlaskConical, Check } from 'lucide-react'
import { NAVI_OPTIONS, NAVI_STORAGE_KEY, type NavigationType } from './map/types'
import GarageEditModal, { type GarageData } from '../components/GarageEditModal'
import { fetchProfile, upsertProfile } from '../lib/profileService'
import FuelLogTab from '../components/FuelLogTab'
import FuelConfirmPopup from '../components/FuelConfirmPopup'
import { useFuel } from '../context/FuelContext'

type Tab = 'garage' | 'fuel'

const INTERVALS = [
  { label: '엔진오일 교체 주기', total: 5000 },
  { label: '타이어 마모 한계', total: 12000 },
  { label: '브레이크 패드', total: 15000 },
]

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.min((current / total) * 100, 100)
  const isWarning = pct >= 80

  return (
    <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/5">
      <div
        className={`h-full rounded-full transition-all duration-700 ${isWarning ? 'bg-rose-400' : 'bg-teal-400'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function ProfilePage() {
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
          onClick={() => setEditOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5"
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
      {/* ── 마이 가라지 카드 ── */}
      <div className="rounded-3xl bg-white/5 p-6 backdrop-blur-xl">
        {/* 바이크 헤더 */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-light uppercase tracking-widest text-white/30">
              My Garage
            </p>
            <p className="mt-1 text-xl font-bold leading-tight text-white">
              {garage.bikeModel}
            </p>
          </div>

          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-baseline gap-1">
              <Gauge size={13} strokeWidth={1.5} className="text-teal-400" />
              <span className="text-2xl font-bold text-white">{garage.totalKm.toLocaleString()}</span>
            </div>
            <span className="text-[10px] font-light text-white/30">누적 km</span>
          </div>
        </div>

        {/* 구분선 */}
        <div className="mb-5 h-px bg-white/5" />

        {/* 소모품 모니터링 */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Wrench size={12} strokeWidth={1.5} className="text-white/30" />
            <span className="text-[10px] font-light uppercase tracking-widest text-white/30">
              소모품 모니터링
            </span>
          </div>

          {INTERVALS.map(({ label, total }) => {
            const current = garage.totalKm % total
            const pct = Math.min(Math.round((current / total) * 100), 100)
            const isWarning = pct >= 80
            return (
              <div key={label} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-light text-white/60">{label}</span>
                  <span
                    className={`text-xs font-light ${isWarning ? 'text-rose-400' : 'text-white/35'}`}
                  >
                    {current.toLocaleString()} / {total.toLocaleString()} km
                  </span>
                </div>
                <ProgressBar current={current} total={total} />
              </div>
            )
          })}
        </div>
      </div>

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
    </div>
  )
}
