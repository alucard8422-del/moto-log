// index.tsx (TourPage)
import { useState, useEffect } from 'react'
import { Plus, Route, Compass, FlagTriangleRight } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import CourseCard, { type CourseCardData } from './tour/CourseCard'
import RecommendationSection from './tour/RecommendationSection'
import AddCourseModal from '../components/AddCourseModal'
import CourseDetailModal from '../components/CourseDetailModal'
import { fetchCourses, insertCourse } from '../lib/courseService'
import type { TourCardData } from '../components/TourCard'
import type { RideSession } from './map/types'

type Tab = 'my' | 'recommend'

const RECOMMENDED: CourseCardData[] = [
  { id: 'r1', title: '북한산 카페 투어', region: '서울 은평', imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=70', mood: '여유로운', distanceKm: 58, rating: 4.8, durationMin: 75 },
  { id: 'r2', title: '양평 벚꽃길 라이딩', region: '경기 양평', imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=400&q=70', mood: '감성적인', distanceKm: 92, rating: 4.6, durationMin: 110 },
  { id: 'r3', title: '대관령 선자령 고갯길', region: '강원 평창', imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=70', mood: '도전적인', distanceKm: 142, rating: 4.9, durationMin: 160 },
  { id: 'r4', title: '서해안 노을 드라이브', region: '충남 태안', imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=70', mood: '감성적인', distanceKm: 95, rating: 4.5, durationMin: 115 },
  { id: 'r5', title: '지리산 성삼재 루트', region: '전남 구례', imageUrl: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=70', mood: '도전적인', distanceKm: 78, rating: 4.7, durationMin: 95 },
  { id: 'r6', title: '제주 한림 해안도로', region: '제주 한림', imageUrl: 'https://images.unsplash.com/photo-1564761901467-7a53e3c0d211?w=400&q=70', mood: '여유로운', distanceKm: 44, rating: 4.4, durationMin: 55 },
]

function toCourseCardData(t: TourCardData, rating = 4.0): CourseCardData {
  return { ...t, rating }
}

function sessionToCourse(s: RideSession): CourseCardData {
  const d = new Date(s.startTime)
  const label = `${d.getMonth() + 1}/${d.getDate()} 라이딩`
  return {
    id: s.id,
    title: label,
    region: '내 기록',
    mood: '여유로운',
    distanceKm: parseFloat(s.distance.toFixed(1)),
    durationMin: Math.round(s.duration / 60),
    rating: 5.0,
    isMyRide: true,
  }
}

export default function TourPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('my')
  const [myCourses, setMyCourses] = useState<CourseCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<CourseCardData | null>(null)
  const [newRideBanner, setNewRideBanner] = useState<string | null>(null)

  useEffect(() => {
    fetchCourses()
      .then((data) => {
        const mapped = data.map((t) => toCourseCardData(t))
        setMyCourses(mapped)
      })
      .catch(() => setMyCourses([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const state = location.state as { completedSession?: RideSession } | null
    if (state?.completedSession) {
      const course = sessionToCourse(state.completedSession)
      setMyCourses((prev) => [course, ...prev])
      setNewRideBanner(`${course.distanceKm}km 주행 기록이 추가됐어요`)
      setTab('my')
      navigate('/courses', { replace: true, state: null })
      setTimeout(() => setNewRideBanner(null), 4000)
    }
  }, [location.state, navigate])

  const handleAdd = (newCourse: TourCardData) => {
    const card = toCourseCardData(newCourse)
    setMyCourses((prev) => [card, ...prev])
    insertCourse(newCourse).then((saved) => {
      if (saved) {
        setMyCourses((prev) => prev.map((c) => (c.id === newCourse.id ? toCourseCardData(saved) : c)))
      }
    })
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-5 pb-32">

      {/* 새 라이딩 완료 배너 */}
      {newRideBanner && (
        <div className="flex items-center gap-2 rounded-2xl bg-teal-400/10 px-4 py-3">
          <FlagTriangleRight size={14} strokeWidth={1.5} className="shrink-0 text-teal-400" />
          <span className="text-xs font-light text-teal-400">{newRideBanner}</span>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-light text-white/30">어디 가실 거에요?</p>
          <h2 className="text-xl font-bold text-white">코스 탐색</h2>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-teal-400/10 px-4 py-2 text-xs font-bold text-teal-400 transition-colors active:bg-teal-400/20"
        >
          <Plus size={13} strokeWidth={2} />
          코스 등록
        </button>
      </div>

      {/* 탭 */}
      <div className="flex rounded-2xl bg-white/5 p-1">
        {([['my', '내 코스', Route], ['recommend', '추천 코스', Compass]] as [Tab, string, typeof Route][]).map(
          ([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs transition-all duration-200 ${
                tab === key ? 'bg-white/10 font-bold text-teal-400' : 'font-light text-white/40'
              }`}
            >
              <Icon size={12} strokeWidth={1.5} />
              {label}
            </button>
          )
        )}
      </div>

      {/* 내 코스 탭 */}
      {tab === 'my' && (
        <>
          {loading && (
            <p className="py-10 text-center text-sm font-light text-white/30">불러오는 중...</p>
          )}

          {!loading && myCourses.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-3xl bg-[#161B26]/60 py-14 backdrop-blur-xl">
              <Route size={28} strokeWidth={1.5} className="text-white/15" />
              <p className="text-sm font-light text-white/30">아직 기록된 코스가 없어요</p>
              <p className="text-xs font-light text-white/20">지도 탭에서 라이딩을 시작해보세요</p>
            </div>
          )}

          {!loading && myCourses.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {myCourses.map((course) => (
                <CourseCard key={course.id} course={course} onPress={setSelectedCourse} />
              ))}
            </div>
          )}
        </>
      )}

      {/* 추천 코스 탭 */}
      {tab === 'recommend' && (
        <>
          <RecommendationSection
            courses={RECOMMENDED.slice(0, 4)}
            onPress={setSelectedCourse}
          />

          <div className="flex items-center gap-2 px-0.5">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-[10px] font-light text-white/25">전체 코스</span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {RECOMMENDED.map((course) => (
              <CourseCard key={course.id} course={course} onPress={setSelectedCourse} />
            ))}
          </div>
        </>
      )}

      {/* 코스 등록 모달 */}
      {modalOpen && (
        <AddCourseModal onClose={() => setModalOpen(false)} onAdd={handleAdd} />
      )}

      {/* 코스 상세 모달 */}
      {selectedCourse && (
        <CourseDetailModal course={selectedCourse} onClose={() => setSelectedCourse(null)} />
      )}
    </div>
  )
}
