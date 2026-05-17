import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Flag, Route, Timer, Gauge } from 'lucide-react'
import CourseCard, { type Course } from '../components/CourseCard'
import type { RideSession } from './map/types'

function fmtDur(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`
}

function SessionSheet({ session, onClose }: { session: RideSession; onClose: () => void }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 16)
    return () => clearTimeout(t)
  }, [])

  const dismiss = () => {
    setOpen(false)
    setTimeout(onClose, 500)
  }

  const avg = session.duration > 0 ? session.distance / (session.duration / 3600) : 0
  const dateLabel = new Date(session.startTime).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })

  const rows = [
    { icon: <Route size={14} strokeWidth={1.5} className="text-teal-400" />, label: '주행 거리', value: `${session.distance.toFixed(2)} km` },
    { icon: <Timer size={14} strokeWidth={1.5} className="text-teal-400" />, label: '주행 시간', value: fmtDur(session.duration) },
    { icon: <Gauge size={14} strokeWidth={1.5} className="text-teal-400" />, label: '평균 속도', value: `${avg.toFixed(0)} km/h` },
  ]

  return (
    <>
      {/* 백드롭 */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={dismiss}
      />

      {/* 바텀 시트 */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto max-w-sm rounded-t-3xl bg-[#161B26]/98 px-6 pt-5 pb-12 backdrop-blur-xl">
          {/* 핸들바 */}
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/20" />

          {/* 헤더 */}
          <div className="mb-6 flex items-center gap-2">
            <Flag size={13} strokeWidth={1.5} className="text-teal-400" />
            <span className="flex-1 text-[10px] font-light uppercase tracking-widest text-white/30">
              {dateLabel} 주행 기록
            </span>
          </div>

          {/* 스탯 로우 */}
          <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-white/5 px-5 py-4">
            {rows.map(({ icon, label, value }, i) => (
              <div key={label}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-sm font-light text-white/40">{label}</span>
                  </div>
                  <span className="text-sm font-bold text-teal-400">{value}</span>
                </div>
                {i < rows.length - 1 && <div className="mt-4 h-px bg-white/5" />}
              </div>
            ))}
          </div>

          {/* 확인 */}
          <button
            onClick={dismiss}
            className="w-full rounded-3xl bg-teal-400 py-4 text-sm font-bold text-slate-950 transition-opacity active:opacity-80"
          >
            확인
          </button>
        </div>
      </div>
    </>
  )
}

const MOCK_COURSES: Course[] = [
  {
    id: '1',
    title: '대관령 양떼목장 & 선자령 라이딩',
    region: '강원도 평창',
    distanceKm: 142,
    durationMin: 210,
    difficulty: 'medium',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=60',
    isBookmarked: true,
  },
  {
    id: '2',
    title: '울릉도 일주도로 완주',
    region: '경상북도 울릉',
    distanceKm: 44,
    durationMin: 90,
    difficulty: 'easy',
    thumbnailUrl: 'https://images.unsplash.com/photo-1564761901467-7a53e3c0d211?w=200&q=60',
  },
  {
    id: '3',
    title: '지리산 성삼재 ~ 노고단 고갯길',
    region: '전라남도 구례',
    distanceKm: 78,
    durationMin: 120,
    difficulty: 'hard',
  },
  {
    id: '4',
    title: '서해안 노을 라이딩 — 태안 해변길',
    region: '충청남도 태안',
    distanceKm: 95,
    durationMin: 150,
    difficulty: 'easy',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&q=60',
  },
]

const FILTER_TAGS = ['전체', '초급', '중급', '고급', '북마크'] as const

export default function CoursesPage() {
  const { state } = useLocation()
  const [session, setSession] = useState<RideSession | null>(
    (state as { completedSession?: RideSession })?.completedSession ?? null
  )

  return (
    <div className="flex flex-col gap-5 p-4">
      {session && <SessionSheet session={session} onClose={() => setSession(null)} />}
      {/* 헤더 */}
      <div>
        <p className="text-xs font-light text-white/40">총 {MOCK_COURSES.length}개 코스</p>
        <h2 className="text-xl font-bold text-white">추천 코스</h2>
      </div>

      {/* 필터 태그 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_TAGS.map((tag, i) => (
          <button
            key={tag}
            onClick={() => console.log('[CoursesPage] 필터 선택:', tag)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-light transition-colors ${
              i === 0
                ? 'bg-teal-400 text-slate-950 font-bold'
                : 'border border-white/5 bg-white/5 text-white/50'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* 코스 리스트 */}
      <div className="flex flex-col gap-3">
        {MOCK_COURSES.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            onPress={(c) => console.log('[CoursesPage] 코스 상세 이동:', c.id)}
            onBookmark={(c) => console.log('[CoursesPage] 북마크 토글:', c.id)}
          />
        ))}
      </div>
    </div>
  )
}
