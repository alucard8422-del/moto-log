// VideoCreatorPage.tsx — 영상 만들기 (인코딩 → 완료)
// VideoCreatorSheet에서 뷰를 선택하고 넘어오면 바로 인코딩 시작

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { loadCourses } from '../../../lib/courseStorage'
import { parseGpxPoints } from '../../../constants/sampleGpxData'
import EncodingPanel from './EncodingPanel'
import VideoPreviewModal from './VideoPreviewModal'
import { VIEW_OPTIONS, type ViewOption } from './videoTypes'
import type { GpxPoint } from '../../../constants/sampleGpxData'

export default function VideoCreatorPage() {
  const { courseId }   = useParams<{ courseId: string }>()
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()

  const selectedView: ViewOption =
    VIEW_OPTIONS.find(v => v.id === searchParams.get('view')) ?? VIEW_OPTIONS[0]

  const [blob,   setBlob]   = useState<Blob | null>(null)
  const [done,   setDone]   = useState(false)
  const [points, setPoints] = useState<GpxPoint[]>([])

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

  if (points.length < 2) return null

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      {/* 인코딩 패널 (맵 애니메이션 + 진행 HUD) */}
      <EncodingPanel
        points={points}
        view={selectedView}
        onComplete={b => { setBlob(b); setDone(true) }}
      />

      {/* 완료 팝업 */}
      <VideoPreviewModal
        blob={done ? blob : null}
        view={selectedView}
        onClose={() => navigate('/my-routes')}
      />
    </div>
  )
}
