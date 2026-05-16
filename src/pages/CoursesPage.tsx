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
    setTimeout(onClose, 300)
  }

  const avg = session.duration > 0 ? session.distance / (session.duration / 3600) : 0
  const dateLabel = new Date(session.startTime).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })

  const stats = [
    { icon: <Route size={12} strokeWidth={1.5} className="text-teal-400" />, value: session.distance.toFixed(2), unit: 'km', label: '주행거리' },
    { icon: <Timer size={12} strokeWidth={1.5} className="text-teal-400" />, value: fmtDur(session.duration), unit: '', label: '주행시간' },
    { icon: <Gauge size={12} strokeWidth={1.5} className="text-teal-400" />, value: avg.toFixed(0), unit: 'km/h', label: '평균속도' },
  ]

  return (
    <>
      {/* 백드롭 */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={dismiss}
      />

      {/* 바텀 시트 */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="mx-auto max-w-sm rounded-t-3xl border-t border-white/10 bg-[#111622]/95 px-5 pt-4 pb-12 backdrop-blur-xl">

          {/* 핸들바 */}
          <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-white/20" />

          {/* 헤더 */}
          <div className="mb-6 flex items-center gap-2">
            <Flag size={13} strokeWidth={1.5} className="text-teal-400" />
            <span className="flex-1 text-xs font-bold uppercase tracking-widest text-white/70"
              style={{ fontFamily: "'Urbanist', sans-serif" }}>
              주행 완료
            </span>
            <span className="text-[10px] font-light text-white/30"
              style={{ fontFamily: "'Urbanist', sans-serif" }}>
              {dateLabel}
            </span>
          </div>

          {/* 스탯 3열 */}
          <div className="mb-6 grid grid-cols-3 gap-2">
            {stats.map(({ icon, value, unit, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/5 py-5">
                {icon}
                <span
                  className="mt-0.5 text-xl font-bold leading-none text-[#2DD4BF]"
                  style={{
                    fontFamily: "'Orbitron', sans-serif",
                    textShadow: '0 0 8px rgba(45,212,191,0.4)',
                  }}
                >
                  {value}
                </span>
                {unit && (
                  <span className="text-[9px] font-light text-teal-400/60"
                    style={{ fontFamily: "'Urbanist', sans-serif" }}>
                    {unit}
                  </span>
                )}
                <span className="text-[9px] font-light uppercase tracking-wider text-white/30"
                  style={{ fontFamily: "'Urbanist', sans-serif" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* 닫기 */}
          <button
            onClick={dismiss}
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-white/5 text-xs font-light tracking-widest text-white/30 transition-opacity active:opacity-60"
            style={{ fontFamily: "'Urbanist', sans-serif" }}
          >
            CLOSE
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
