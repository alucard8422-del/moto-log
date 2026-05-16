import CourseCard, { type Course } from '../components/CourseCard'

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
  return (
    <div className="flex flex-col gap-5 p-4">
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
