// VideoCreatorSheet.tsx — 영상 만들기 뷰 선택 바텀시트
// 앱 공통 팝업 스타일 (EditModal / FuelCompleteSheet 동일)

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clapperboard, ChevronRight, Play } from 'lucide-react'
import { VIEW_OPTIONS, type ViewOption } from '../video/videoTypes'
import type { SavedCourse } from '../../lib/courseStorage'
import { cityLabel } from './routeUtils'

interface Props {
  course:  SavedCourse
  onClose: () => void
}

export default function VideoCreatorSheet({ course, onClose }: Props) {
  const [open,   setOpen]   = useState(false)
  const [picked, setPicked] = useState<ViewOption>(VIEW_OPTIONS[0])
  const navigate = useNavigate()

  // 16ms 후 open → translate 애니메이션
  useEffect(() => { const t = setTimeout(() => setOpen(true), 16); return () => clearTimeout(t) }, [])
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleStart() {
    onClose()
    navigate(`/video-creator/${course.id}?view=${picked.id}`)
  }

  function handlePreview() {
    onClose()
    navigate(`/video-preview/${course.id}?view=${picked.id}`)
  }

  return (
    <>
      {/* 딤 */}
      <div
        className={`fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* 시트 */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[80] transition-transform duration-500 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto max-w-sm rounded-t-3xl border border-white/10 bg-[#161B26]/98 px-5 pt-5 pb-10 backdrop-blur-xl">

          {/* 핸들 */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

          {/* 헤더 */}
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-400/10">
              <Clapperboard size={18} strokeWidth={1.5} className="text-teal-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-light text-white/30">영상 만들기</p>
              <p className="text-sm font-bold text-white leading-tight">
                {cityLabel(course.gpxPoints)}
              </p>
            </div>
          </div>

          {/* 구분선 */}
          <div className="mb-3 h-px bg-white/5" />

          {/* 뷰 선택 목록 */}
          <div className="flex flex-col gap-1">
            {VIEW_OPTIONS.map(v => {
              const active = picked.id === v.id
              return (
                <button
                  key={v.id}
                  onClick={() => setPicked(v)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors duration-150 active:opacity-70 ${
                    active ? 'bg-teal-400/10' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  {/* 이모지 */}
                  <span className="text-xl shrink-0">{v.emoji}</span>

                  {/* 텍스트 */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${active ? 'text-teal-400' : 'text-white/80'}`}>
                      {v.name}
                    </p>
                    <p className="text-[11px] font-light text-white/35 leading-snug">{v.desc}</p>
                  </div>

                  {/* 스펙 태그 */}
                  <div className="flex shrink-0 flex-col items-end gap-0.5 text-[9px] text-white/25">
                    <span>{v.pitch}° pitch</span>
                    <span>zoom {v.zoom}</span>
                  </div>

                  {/* 체크 / 화살표 */}
                  {active ? (
                    <div className="h-4 w-4 shrink-0 rounded-full border-2 border-teal-400 bg-teal-400 flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />
                    </div>
                  ) : (
                    <ChevronRight size={14} strokeWidth={1.5} className="shrink-0 text-white/15" />
                  )}
                </button>
              )
            })}
          </div>

          {/* 구분선 */}
          <div className="my-3 h-px bg-white/5" />

          {/* 선택된 뷰 설명 */}
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-white/[0.04] px-4 py-3">
            <span className="text-xl">{picked.emoji}</span>
            <div>
              <p className="text-[11px] font-semibold text-teal-400">{picked.name}</p>
              <p className="text-[10px] font-light text-white/35">{picked.desc}</p>
            </div>
          </div>

          {/* 버튼 행: 경로 미리보기 + 영상 만들기 */}
          <div className="flex gap-2">
            {/* 경로 미리보기 */}
            <button
              onClick={handlePreview}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-3xl border border-teal-400/40 bg-teal-400/10 py-4 text-sm font-bold text-teal-400 transition-opacity active:opacity-70"
            >
              <Play size={14} strokeWidth={2.5} />
              미리보기
            </button>

            {/* 영상 만들기 */}
            <button
              onClick={handleStart}
              className="flex flex-[1.6] items-center justify-center gap-2 rounded-3xl bg-teal-400 py-4 text-sm font-bold text-slate-950 transition-opacity active:opacity-80"
            >
              <Clapperboard size={15} strokeWidth={2} />
              영상 만들기
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
