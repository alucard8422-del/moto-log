import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import TourCard, { type TourCardData } from '../components/TourCard'
import AddCourseModal from '../components/AddCourseModal'
import CourseDetailModal from '../components/CourseDetailModal'
import { fetchCourses, insertCourse } from '../lib/courseService'

const FILTERS = ['전체', '산악', '해안', '드라이브', '카페투어'] as const
type Filter = (typeof FILTERS)[number]

const INITIAL_TOURS: TourCardData[] = [
  {
    id: '1',
    title: '북한산 카페 투어',
    region: '서울 은평',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=70',
    mood: '여유로운',
    distanceKm: 58,
  },
  {
    id: '2',
    title: '양평 벚꽃길 라이딩',
    region: '경기 양평',
    imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=400&q=70',
    mood: '감성적인',
    distanceKm: 92,
  },
  {
    id: '3',
    title: '대관령 선자령 고갯길',
    region: '강원 평창',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=70',
    mood: '도전적인',
    distanceKm: 142,
  },
  {
    id: '4',
    title: '서해안 노을 드라이브',
    region: '충남 태안',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=70',
    mood: '감성적인',
    distanceKm: 95,
  },
  {
    id: '5',
    title: '지리산 성삼재 루트',
    region: '전남 구례',
    imageUrl: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=70',
    mood: '도전적인',
    distanceKm: 78,
  },
  {
    id: '6',
    title: '제주 한림 해안도로',
    region: '제주 한림',
    imageUrl: 'https://images.unsplash.com/photo-1564761901467-7a53e3c0d211?w=400&q=70',
    mood: '여유로운',
    distanceKm: 44,
  },
]

export default function TourPage() {
  const [tours, setTours] = useState<TourCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<Filter>('전체')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedTour, setSelectedTour] = useState<TourCardData | null>(null)

  useEffect(() => {
    fetchCourses()
      .then((data) => setTours(data.length ? data : INITIAL_TOURS))
      .catch(() => setTours(INITIAL_TOURS))
      .finally(() => setIsLoading(false))
  }, [])

  const handleAdd = (newCourse: TourCardData) => {
    setTours((prev) => [newCourse, ...prev])
    insertCourse(newCourse).then((saved) => {
      if (saved) {
        setTours((prev) => prev.map((t) => (t.id === newCourse.id ? saved : t)))
        console.log('[TourPage] 서버 저장 완료:', saved.id)
      }
    })
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-light text-white/30">라이더가 선택한</p>
          <h2 className="text-xl font-bold text-white">추천 투어 코스</h2>
        </div>

        {/* 코스 등록 버튼 */}
        <button
          onClick={() => {
            console.log('[TourPage] 코스 등록 모달 오픈')
            setModalOpen(true)
          }}
          className="flex items-center gap-1.5 rounded-full bg-teal-400/10 px-4 py-2 text-xs font-bold text-teal-400 transition-colors hover:bg-teal-400/20 active:scale-95"
        >
          <Plus size={13} strokeWidth={2} />
          코스 등록
        </button>
      </div>

      {/* 필터 바 */}
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => {
          const isActive = activeFilter === f
          return (
            <button
              key={f}
              onClick={() => {
                console.log('[TourPage] 필터 변경:', f)
                setActiveFilter(f)
              }}
              className={`shrink-0 rounded-full px-4 py-2 text-xs transition-all duration-200 ${
                isActive
                  ? 'bg-white/10 font-bold text-teal-400'
                  : 'bg-white/5 font-light text-white/40 hover:text-white/60'
              }`}
            >
              {f}
            </button>
          )
        })}
      </div>

      {/* 2열 그리드 */}
      {isLoading && (
        <p className="py-10 text-center text-sm font-light text-white/30">
          코스를 불러오는 중...
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 pb-4">
        {tours.map((tour, i) => (
          <TourCard
            key={tour.id}
            card={tour}
            tall={i % 5 === 0}
            onPress={(c) => setSelectedTour(c)}
          />
        ))}
      </div>

      {/* 코스 등록 모달 */}
      {modalOpen && (
        <AddCourseModal
          onClose={() => setModalOpen(false)}
          onAdd={handleAdd}
        />
      )}

      {/* 코스 상세 모달 */}
      {selectedTour && (
        <CourseDetailModal
          course={selectedTour}
          onClose={() => setSelectedTour(null)}
        />
      )}
    </div>
  )
}
