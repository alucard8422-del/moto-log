// ConfirmPanel.tsx — 코스 확정 후 정보 입력 패널 (하단 슬라이드업)
// 코스 이름 · 한줄 팁 입력 → 내 경로 저장 / 커뮤니티 공유

import { motion } from 'framer-motion'
import { CheckCircle, RotateCcw, BookmarkPlus, Users } from 'lucide-react'
import type { LatLng } from '../routes/routeUtils'

interface Props {
  points:        LatLng[]
  dist:          number
  title:         string
  tip:           string
  done:          boolean
  canSave:       boolean
  onReEdit:      () => void
  onTitleChange: (v: string) => void
  onTipChange:   (v: string) => void
  onSave:        (isPublic: boolean) => void
}

export default function ConfirmPanel({
  points, dist: _dist, title, tip, done, canSave,
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
      <div className="mx-auto w-full max-w-sm rounded-t-3xl border border-white/10 bg-[#0D1117]/97 px-5 pt-4 pb-10 backdrop-blur-2xl">
        {/* 상단 핸들 */}
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />

        {/* 헤더 행 */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] font-light uppercase tracking-widest text-white/30">
            코스 정보 입력
          </p>
          <button
            onClick={onReEdit}
            className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 active:opacity-60"
          >
            <RotateCcw size={10} strokeWidth={2} className="text-white/40" />
            <span className="text-[10px] font-light text-white/40">다시 수정하기</span>
          </button>
        </div>

        {/* 코스 이름 */}
        <div className="mb-3">
          <label className="mb-1.5 flex items-center gap-1 text-[10px] font-light uppercase tracking-widest text-white/30">
            코스 이름 <span className="text-rose-400">*</span>
          </label>
          <input
            value={title}
            onChange={e => onTitleChange(e.target.value)}
            placeholder="예: 대전 → 대청호 꿀바리 코스"
            maxLength={40}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#FF5A00]/60 focus:bg-white/[0.07] transition-colors"
          />
          {title.trim().length === 0 && (
            <p className="mt-1.5 text-[10px] text-rose-400/60">
              코스 이름을 입력해야 저장할 수 있어요
            </p>
          )}
        </div>

        {/* 한줄 팁 */}
        <div className="mb-5">
          <label className="mb-1.5 block text-[10px] font-light uppercase tracking-widest text-white/30">
            한줄 팁 <span className="text-white/15">(선택)</span>
          </label>
          <input
            value={tip}
            onChange={e => onTipChange(e.target.value)}
            placeholder="예: 대청호 뷰포인트에서 꼭 쉬어가세요!"
            maxLength={60}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#FF5A00]/60 focus:bg-white/[0.07] transition-colors"
          />
        </div>

        {/* 저장 버튼 영역 */}
        {done ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-[#FF5A00]/15 py-4 text-sm font-bold text-[#FF5A00]">
            <CheckCircle size={16} strokeWidth={2} />
            저장 완료 — 내 경로로 돌아갑니다
          </div>
        ) : (
          <div className="flex gap-2">
            <motion.button
              onClick={() => onSave(false)}
              disabled={!canSave}
              whileTap={canSave ? { scale: 0.96 } : {}}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-4 text-sm font-bold transition-colors ${
                canSave
                  ? 'bg-[#475569] text-white active:opacity-75'
                  : 'cursor-not-allowed bg-white/5 text-white/20'
              }`}
            >
              <BookmarkPlus size={15} strokeWidth={2} />
              내 경로 저장
            </motion.button>

            <motion.button
              onClick={() => onSave(true)}
              disabled={!canSave}
              whileTap={canSave ? { scale: 0.96 } : {}}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-4 text-sm font-bold transition-colors ${
                canSave
                  ? 'bg-[#FF5A00] text-white active:opacity-80'
                  : 'cursor-not-allowed bg-white/5 text-white/20'
              }`}
            >
              <Users size={15} strokeWidth={2} />
              커뮤니티 공유
            </motion.button>
          </div>
        )}

        {/* 유효성 힌트 */}
        {!canSave && !done && (
          <p className="mt-2 text-center text-[10px] text-white/20">
            {points.length < 2 ? '경유지를 2개 이상 추가하세요' : '코스 이름을 입력하세요'}
          </p>
        )}
      </div>
    </motion.div>
  )
}
