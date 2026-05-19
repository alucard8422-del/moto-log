// VideoCreatorSheet.tsx — 영상 만들기 바텀시트
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clapperboard, Play } from 'lucide-react'
import type { SavedCourse } from '../../lib/courseStorage'
import { cityLabel } from './routeUtils'

interface Props {
  course:  SavedCourse
  onClose: () => void
}

export default function VideoCreatorSheet({ course, onClose }: Props) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { const t = setTimeout(() => setOpen(true), 16); return () => clearTimeout(t) }, [])
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleStart() {
    onClose()
    navigate(`/video-creator/${course.id}`)
  }

  function handlePreview() {
    onClose()
    navigate(`/video-preview/${course.id}`)
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
          <div className="mb-5 flex items-start gap-3">
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

          {/* 버튼 행: 경로 미리보기 + 영상 만들기 */}
          <div className="flex gap-2">
            <button
              onClick={handlePreview}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-3xl border border-teal-400/40 bg-teal-400/10 py-4 text-sm font-bold text-teal-400 transition-opacity active:opacity-70"
            >
              <Play size={14} strokeWidth={2.5} />
              미리보기
            </button>

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
