// TourPage.tsx — 추천 코스 전용 루트 뷰 (서브탭 제거)
import { useState } from 'react'
import CourseCard, { type CourseCardData } from './tour/CourseCard'
import RecommendationSection from './tour/RecommendationSection'
import CourseDetailModal from '../components/CourseDetailModal'

const RECOMMENDED: CourseCardData[] = [
  { id: 'r1', title: '북한산 카페 투어',    region: '서울 은평', imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=70', mood: '여유로운',  distanceKm: 58,  rating: 4.8, durationMin: 75  },
  { id: 'r2', title: '양평 벚꽃길 라이딩',  region: '경기 양평', imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=400&q=70', mood: '감성적인',  distanceKm: 92,  rating: 4.6, durationMin: 110 },
  { id: 'r3', title: '대관령 선자령 고갯길', region: '강원 평창', imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=70', mood: '도전적인',  distanceKm: 142, rating: 4.9, durationMin: 160 },
  { id: 'r4', title: '서해안 노을 드라이브', region: '충남 태안', imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=70', mood: '감성적인',  distanceKm: 95,  rating: 4.5, durationMin: 115 },
  { id: 'r5', title: '지리산 성삼재 루트',  region: '전남 구례', imageUrl: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=70', mood: '도전적인',  distanceKm: 78,  rating: 4.7, durationMin: 95  },
  { id: 'r6', title: '제주 한림 해안도로',  region: '제주 한림', imageUrl: 'https://images.unsplash.com/photo-1564761901467-7a53e3c0d211?w=400&q=70', mood: '여유로운',  distanceKm: 44,  rating: 4.4, durationMin: 55  },
]

export default function TourPage() {
  const [selected, setSelected] = useState<CourseCardData | null>(null)

  return (
    <div className="flex flex-col gap-5 px-4 pt-5 pb-32">

      {/* 헤더 */}
      <div>
        <p className="text-xs font-light text-white/30">라이더가 검증한 코스</p>
        <h2 className="text-xl font-bold text-white">추천 코스</h2>
      </div>

      {/* 피처드 섹션 */}
      <RecommendationSection
        courses={RECOMMENDED.slice(0, 4)}
        onPress={setSelected}
      />

      {/* 구분선 */}
      <div className="flex items-center gap-2 px-0.5">
        <div className="h-px flex-1 bg-white/5" />
        <span className="text-[10px] font-light text-white/25">전체 코스</span>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      {/* 전체 그리드 */}
      <div className="grid grid-cols-2 gap-3">
        {RECOMMENDED.map((course) => (
          <CourseCard key={course.id} course={course} onPress={setSelected} />
        ))}
      </div>

      {/* 상세 모달 */}
      {selected && (
        <CourseDetailModal course={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
