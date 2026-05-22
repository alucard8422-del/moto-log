// ConfirmPanel.tsx — 코스 확정 후 정보 입력 패널 (하단 슬라이드업)
//
// 디자인 원칙:
//  - 흰 카드 패널 + 어두운 지도 = 강한 명암 대비로 시각적 분리
//  - 검정 계열 텍스트 on 흰 배경 → WCAG AAA 대비 자동 충족
//  - 브랜드 오렌지(#FF5A00)는 흰 배경에서 최대 채도로 살아남

import { motion } from 'framer-motion'
import { CheckCircle2, RotateCcw, BookmarkPlus, PenLine, MapPin, Route, X } from 'lucide-react'
import type { LatLng } from '../routes/routeUtils'

interface Props {
  points:        LatLng[]
  dist:          number
  title:         string
  tip:           string
  done:          boolean
  canSave:       boolean
  isEditMode?:   boolean
  onReEdit:      () => void
  onTitleChange: (v: string) => void
  onTipChange:   (v: string) => void
  onSave:        (isPublic: boolean) => void
}

export default function ConfirmPanel({
  points, dist, title, tip, done, canSave, isEditMode,
  onReEdit, onTitleChange, onTipChange, onSave,
}: Props) {
  return (
    <motion.div
      key="info-panel"
      className="absolute inset-x-0 bottom-0 z-[1000]"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="mx-auto w-full max-w-sm overflow-hidden rounded-t-[2rem] shadow-2xl shadow-black/60">

        {/* 상단 오렌지 포인트 라인 */}
        <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-[#FF5A00] to-transparent" />

        <div className="bg-white px-5 pt-4 pb-10">

          {/* 핸들 */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />

          {/* 헤더 */}
          <div className="mb-4 flex items-start justify-between">
            <div>
              {/* 주 제목 */}
              <p className="text-[15px] font-bold text-gray-900">
                {isEditMode ? '경유지 수정' : '코스 확정'}
              </p>
              {/* 거리 + 경유지 수 */}
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="flex items-center gap-1 rounded-full bg-[#FF5A00]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#FF5A00]">
                  <Route size={9} strokeWidth={3} />
                  {dist.toFixed(1)} km
                </span>
                <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-400">
                  <MapPin size={9} strokeWidth={2.5} />
                  경유지 {points.length}개
                </span>
              </div>
            </div>

            {/* 다시 수정 버튼 */}
            <button
              onClick={onReEdit}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 active:bg-gray-100"
            >
              <RotateCcw size={10} strokeWidth={2.5} className="text-gray-400" />
              <span className="text-[10px] font-medium text-gray-400">다시 수정</span>
            </button>
          </div>

          {/* 구분선 */}
          <div className="mb-4 h-px bg-gray-100" />

          {/* 코스 이름 */}
          <div className="mb-3">
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
              코스 이름
              <span className="rounded bg-[#FF5A00] px-1 py-px text-[8px] font-bold text-white">필수</span>
            </label>
            <div className={`flex items-center rounded-xl border bg-gray-50 transition-colors duration-150 ${
              title.trim().length > 0 ? 'border-[#FF5A00]/50' : 'border-gray-200'
            }`}>
              <input
                value={title}
                onChange={e => onTitleChange(e.target.value)}
                placeholder="예: 대전 → 대청호 꿀바리 코스"
                maxLength={40}
                className="flex-1 bg-transparent px-4 py-3 text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-300 outline-none"
              />
              {title.trim().length > 0 && (
                <span className="pr-3 text-[10px] text-gray-300">{title.length}/40</span>
              )}
            </div>
            {title.trim().length === 0 && (
              <p className="mt-1.5 text-[10px] text-rose-400">코스 이름을 입력해야 저장할 수 있어요</p>
            )}
          </div>

          {/* 한줄 팁 */}
          <div className="mb-5">
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
              메모
              <span className="text-[10px] font-normal text-gray-300">선택</span>
            </label>
            <input
              value={tip}
              onChange={e => onTipChange(e.target.value)}
              placeholder="예: 대청호 뷰포인트에서 꼭 쉬어가세요!"
              maxLength={60}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-300 outline-none transition-colors focus:border-gray-300"
            />
          </div>

          {/* 저장 버튼 영역 */}
          {done ? (
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#FF5A00]/8 py-4 ring-1 ring-[#FF5A00]/20"
            >
              <CheckCircle2 size={15} strokeWidth={2.5} className="text-[#FF5A00]" />
              <span className="text-sm font-bold text-[#FF5A00]">
                {isEditMode ? '수정 완료 — 내 경로로 돌아갑니다' : '저장 완료 — 내 경로로 돌아갑니다'}
              </span>
            </motion.div>

          ) : isEditMode ? (
            <motion.button
              onClick={() => onSave(false)}
              disabled={!canSave}
              whileTap={canSave ? { scale: 0.97 } : {}}
              className={`w-full rounded-2xl py-4 text-sm font-bold transition-all ${
                canSave
                  ? 'bg-[#FF5A00] text-white shadow-md shadow-orange-200 active:opacity-90'
                  : 'cursor-not-allowed bg-gray-100 text-gray-300'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <PenLine size={14} strokeWidth={2.5} />
                경유지 수정 완료
              </span>
            </motion.button>

          ) : (
            <div className="flex gap-2">
              {/* 취소 — 아웃라인 */}
              <motion.button
                onClick={onReEdit}
                whileTap={{ scale: 0.97 }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-white py-4 text-sm font-bold text-gray-400 active:bg-gray-50"
              >
                <X size={14} strokeWidth={2.5} />
                취소
              </motion.button>

              {/* 내 경로에 저장하기 — 오렌지 강조 */}
              <motion.button
                onClick={() => onSave(false)}
                disabled={!canSave}
                whileTap={canSave ? { scale: 0.97 } : {}}
                className={`flex flex-[1.6] items-center justify-center gap-1.5 rounded-2xl py-4 text-sm font-bold transition-all ${
                  canSave
                    ? 'bg-[#FF5A00] text-white shadow-md shadow-orange-200 active:opacity-90'
                    : 'cursor-not-allowed bg-gray-100 text-gray-300'
                }`}
              >
                <BookmarkPlus size={14} strokeWidth={2.5} />
                내 경로에 저장
              </motion.button>
            </div>
          )}

          {/* 유효성 힌트 */}
          {!canSave && !done && (
            <p className="mt-2.5 text-center text-[10px] text-gray-300">
              {points.length < 2 ? '경유지를 2개 이상 추가하세요' : '코스 이름을 입력하세요'}
            </p>
          )}

        </div>
      </div>
    </motion.div>
  )
}
