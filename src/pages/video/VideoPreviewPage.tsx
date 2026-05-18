// VideoPreviewPage.tsx — GPX 경로 미리보기 페이지
// 영상 제작 전에 경로가 올바른지 빠르게 확인
// PREVIEW_RATE=400 → 3시간 라이딩을 약 27초에 재생

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Clapperboard, RotateCcw } from 'lucide-react'
import { loadCourses } from '../../lib/courseStorage'
import { parseGpxPoints } from '../../data/sampleGpxData'
import MapboxPreview from './MapboxPreview'
import { VIEW_OPTIONS, type ViewOption } from './videoTypes'
import type { GpxPoint } from '../../data/sampleGpxData'

export default function VideoPreviewPage() {
  const { courseId }   = useParams<{ courseId: string }>()
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()

  const selectedView: ViewOption =
    VIEW_OPTIONS.find(v => v.id === searchParams.get('view')) ?? VIEW_OPTIONS[0]

  const [points,  setPoints]  = useState<GpxPoint[]>([])
  const [pct,     setPct]     = useState(0)
  const [ended,   setEnded]   = useState(false)
  const [previewKey, setPreviewKey] = useState(0)   // 다시보기용 리마운트 키

  useEffect(() => {
    const courses = loadCourses()
    const course  = courses.find(c => c.id === courseId)
    if (!course) { navigate('/my-routes'); return }

    if (course.gpxXml && course.gpxXml.length > 50) {
      const parsed = parseGpxPoints(course.gpxXml)
      if (parsed.length >= 2) { setPoints(parsed); return }
    }
    setPoints(course.gpxPoints.map((p, i) => ({
      lat: p.lat, lng: p.lng, timestamp: i * 180_000,
    })))
  }, [courseId, navigate])

  function handleReplay() {
    setPct(0)
    setEnded(false)
    setPreviewKey(k => k + 1)
  }

  function handleMakeVideo() {
    navigate(`/video-creator/${courseId}?view=${selectedView.id}`)
  }

  if (points.length < 2) return null

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">

      {/* 맵 미리보기 */}
      <MapboxPreview
        key={previewKey}
        points={points}
        view={selectedView}
        onProgress={setPct}
        onEnd={() => setEnded(true)}
      />

      {/* 상단 헤더 */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center gap-3 px-4 pt-safe-top pb-3 bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm active:opacity-70"
        >
          <ArrowLeft size={18} strokeWidth={1.5} className="text-white" />
        </button>
        <div>
          <p className="text-[10px] font-light text-white/40 tracking-wider uppercase">경로 미리보기</p>
          <p className="text-sm font-semibold text-white leading-tight">{selectedView.name}</p>
        </div>

        {/* 배속 표시 */}
        <div className="ml-auto rounded-full border border-white/15 bg-white/8 px-2.5 py-1">
          <span className="text-[10px] font-bold text-white/50">× 400</span>
        </div>
      </div>

      {/* 하단 컨트롤 */}
      <div className="absolute bottom-0 inset-x-0 z-10 px-5 pb-safe-bottom pt-4 bg-gradient-to-t from-black/80 to-transparent">

        {/* 진행률 바 */}
        <div className="mb-4 flex items-center gap-3">
          <span className="text-[10px] tabular-nums font-light text-white/40 w-8 text-right">
            {pct}%
          </span>
          <div className="flex-1 h-[3px] rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-teal-400 transition-none"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] font-light text-white/40 w-8">100%</span>
        </div>

        {/* 버튼 영역 */}
        <div className="flex gap-3 pb-2">
          {/* 다시보기 */}
          <button
            onClick={handleReplay}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 py-3.5 text-sm font-semibold text-white/70 active:opacity-70"
          >
            <RotateCcw size={15} strokeWidth={2} />
            다시보기
          </button>

          {/* 영상 만들기 */}
          <button
            onClick={handleMakeVideo}
            disabled={!ended}
            className={`flex flex-[2] items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-all active:opacity-80 ${
              ended
                ? 'bg-teal-400 text-slate-950'
                : 'bg-teal-400/20 text-teal-400/50 cursor-not-allowed'
            }`}
          >
            <Clapperboard size={15} strokeWidth={2} />
            {ended ? '이대로 영상 만들기' : '경로 확인 중…'}
          </button>
        </div>
      </div>
    </div>
  )
}
