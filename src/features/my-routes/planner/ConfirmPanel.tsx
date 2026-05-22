// ConfirmPanel.tsx — 코스 확정 후 정보 입력 패널 (하단 슬라이드업)

import { motion } from 'framer-motion'
import { CheckCircle2, RotateCcw, BookmarkPlus, Globe2, PenLine, MapPin, Route } from 'lucide-react'
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
      <div className="mx-auto w-full max-w-sm overflow-hidden rounded-t-3xl">

        {/* 상단 주황 그라디언트 라인 */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#FF5A00] to-transparent opacity-70" />

        <div className="border-x border-b border-white/[0.07] bg-[#0D1117]/98 px-5 pt-4 pb-10 backdrop-blur-2xl">

          {/* 핸들 */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />

          {/* 헤더 */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-light uppercase tracking-[0.2em] text-white/25">
                코스 정보 입력
              </p>
              {/* 거리 + 경유지 수 뱃지 */}
              <div className="mt-1.5 flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-full bg-[#FF5A00]/15 px-2.5 py-1 text-[11px] font-semibold text-[#FF5A00]">
                  <Route size={10} strokeWidth={2.5} />
                  {dist.toFixed(1)} km
                </span>
                <span className="flex items-center gap-1 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-semibold text-white/40">
                  <MapPin size={10} strokeWidth={2} />
                  경유지 {points.length}개
                </span>
              </div>
            </div>
            <button
              onClick={onReEdit}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 active:opacity-60"
            >
              <RotateCcw size={10} strokeWidth={2} className="text-white/30" />
              <span className="text-[10px] font-light text-white/30">다시 수정</span>
            </button>
          </div>

          {/* 구분선 */}
          <div className="mb-4 h-px w-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          {/* 코스 이름 */}
          <div className="mb-3">
            <label className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-white/35">
              코스 이름
              <span className="rounded-sm bg-[#FF5A00]/20 px-1 py-px text-[8px] font-bold text-[#FF5A00]">필수</span>
            </label>
            <div className={`relative rounded-xl transition-all duration-200 ${
              title.trim().length > 0
                ? 'ring-1 ring-[#FF5A00]/40'
                : 'ring-1 ring-white/[0.08]'
            }`}>
              <input
                value={title}
                onChange={e => onTitleChange(e.target.value)}
                placeholder="예: 대전 → 대청호 꿀바리 코스"
                maxLength={40}
                className="w-full rounded-xl bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/15 outline-none"
              />
              {title.trim().length > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/20">
                  {title.length}/40
                </span>
              )}
            </div>
          </div>

          {/* 한줄 팁 */}
          <div className="mb-5">
            <label className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-white/35">
              한줄 팁
              <span className="text-[10px] font-light normal-case tracking-normal text-white/15">선택</span>
            </label>
            <input
              value={tip}
              onChange={e => onTipChange(e.target.value)}
              placeholder="예: 대청호 뷰포인트에서 꼭 쉬어가세요!"
              maxLength={60}
              className="w-full rounded-xl bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/15 outline-none ring-1 ring-white/[0.08] transition-all duration-200 focus:ring-white/20"
            />
          </div>

          {/* 저장 버튼 영역 */}
          {done ? (
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#FF5A00]/10 py-4 ring-1 ring-[#FF5A00]/25"
            >
              <CheckCircle2 size={15} strokeWidth={2.5} className="text-[#FF5A00]" />
              <span className="text-sm font-semibold text-[#FF5A00]">
                {isEditMode ? '수정 완료 — 내 경로로 돌아갑니다' : '저장 완료 — 내 경로로 돌아갑니다'}
              </span>
            </motion.div>

          ) : isEditMode ? (
            <motion.button
              onClick={() => onSave(false)}
              disabled={!canSave}
              whileTap={canSave ? { scale: 0.97 } : {}}
              className={`relative w-full overflow-hidden rounded-2xl py-4 text-sm font-bold transition-all ${
                canSave
                  ? 'bg-[#FF5A00] text-white shadow-lg shadow-orange-900/30 active:opacity-90'
                  : 'cursor-not-allowed bg-white/[0.05] text-white/20'
              }`}
            >
              {canSave && (
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.06] to-white/0" />
              )}
              <span className="relative flex items-center justify-center gap-2">
                <PenLine size={14} strokeWidth={2.5} />
                경유지 수정 완료
              </span>
            </motion.button>

          ) : (
            <div className="flex gap-2">
              {/* 내 경로 저장 */}
              <motion.button
                onClick={() => onSave(false)}
                disabled={!canSave}
                whileTap={canSave ? { scale: 0.97 } : {}}
                className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-4 text-sm font-bold transition-all ${
                  canSave
                    ? 'bg-white/[0.07] text-white ring-1 ring-white/[0.12] active:bg-white/10'
                    : 'cursor-not-allowed bg-white/[0.03] text-white/15'
                }`}
              >
                <BookmarkPlus size={14} strokeWidth={2.5} />
                내 경로
              </motion.button>

              {/* 커뮤니티 공유 */}
              <motion.button
                onClick={() => onSave(true)}
                disabled={!canSave}
                whileTap={canSave ? { scale: 0.97 } : {}}
                className={`relative flex flex-[1.4] overflow-hidden items-center justify-center gap-1.5 rounded-2xl py-4 text-sm font-bold transition-all ${
                  canSave
                    ? 'bg-[#FF5A00] text-white shadow-lg shadow-orange-900/30 active:opacity-90'
                    : 'cursor-not-allowed bg-white/[0.05] text-white/20'
                }`}
              >
                {canSave && (
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.08] to-white/0" />
                )}
                <span className="relative flex items-center gap-1.5">
                  <Globe2 size={14} strokeWidth={2.5} />
                  커뮤니티 공유
                </span>
              </motion.button>
            </div>
          )}

          {/* 유효성 힌트 */}
          {!canSave && !done && (
            <p className="mt-2.5 text-center text-[10px] text-white/20">
              {points.length < 2 ? '경유지를 2개 이상 추가하세요' : '코스 이름을 입력하세요'}
            </p>
          )}

        </div>
      </div>
    </motion.div>
  )
}
