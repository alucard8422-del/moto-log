import { useState } from 'react'
import { X, Bike } from 'lucide-react'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

export interface GarageData {
  bikeModel: string
  totalKm: number
  ridingHours: string
  completedCourses: number
}

interface GarageEditModalProps {
  data: GarageData
  onClose: () => void
  onSave: (next: GarageData) => void
}

export default function GarageEditModal({ data, onClose, onSave }: GarageEditModalProps) {
  useBodyScrollLock()
  const [bikeModel, setBikeModel] = useState(data.bikeModel)
  const [totalKm, setTotalKm] = useState(String(data.totalKm))
  const [ridingHours, setRidingHours] = useState(data.ridingHours)
  const [completedCourses, setCompletedCourses] = useState(String(data.completedCourses))

  const canSave = bikeModel.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    onSave({
      bikeModel: bikeModel.trim(),
      totalKm: Number(totalKm) || 0,
      ridingHours: ridingHours.trim() || '0h',
      completedCourses: Number(completedCourses) || 0,
    })
    console.log('[GarageEditModal] 가라지 정보 저장:', { bikeModel, totalKm, ridingHours, completedCourses })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-sm rounded-t-3xl border border-white/10 bg-slate-900/90 p-6 pb-10 shadow-2xl shadow-black/60 backdrop-blur-xl sm:rounded-3xl sm:pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bike size={16} strokeWidth={1.5} className="text-[#FF5A00]" />
            <h2 className="text-base font-bold text-white">가라지 편집</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white/70"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* 바이크 기종 */}
          <Field label="바이크 기종">
            <input
              value={bikeModel}
              onChange={(e) => setBikeModel(e.target.value)}
              placeholder="예) Honda CB500F"
              className={INPUT}
            />
          </Field>

          {/* 누적 주행거리 + 라이딩 시간 */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="누적 주행거리 (km)">
              <input
                value={totalKm}
                onChange={(e) => setTotalKm(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                inputMode="numeric"
                className={INPUT}
              />
            </Field>
            <Field label="라이딩 시간">
              <input
                value={ridingHours}
                onChange={(e) => setRidingHours(e.target.value)}
                placeholder="예) 48h"
                className={INPUT}
              />
            </Field>
          </div>

          {/* 완주 코스 수 */}
          <Field label="완주 코스 수">
            <input
              value={completedCourses}
              onChange={(e) => setCompletedCourses(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              inputMode="numeric"
              className={INPUT}
            />
          </Field>

          {/* 소모품 안내 */}
          <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
            <p className="text-[11px] font-light leading-relaxed text-white/30">
              누적 주행거리 입력 시 엔진오일(5,000km), 타이어(12,000km),
              브레이크 패드(15,000km) 교체 주기가 자동으로 계산됩니다.
            </p>
          </div>
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="mt-6 w-full rounded-2xl bg-[#FF5A00] py-4 text-sm font-bold text-white transition-opacity disabled:opacity-30 active:opacity-80"
        >
          저장하기
        </button>
      </div>
    </div>
  )
}

/* ── 로컬 헬퍼 ── */
const INPUT =
  'w-full rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-light text-white placeholder-white/20 outline-none focus:border-[#FF5A00]/40'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-light uppercase tracking-widest text-white/30">
        {label}
      </label>
      {children}
    </div>
  )
}
