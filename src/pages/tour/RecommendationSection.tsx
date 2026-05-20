// RecommendationSection.tsx
import { Compass, Wind, Thermometer } from 'lucide-react'
import type { CourseCardData } from './CourseCard'

interface Props {
  courses: CourseCardData[]
  onPress: (c: CourseCardData) => void
}

const MOOD_GRADIENT: Record<CourseCardData['mood'], string> = {
  '여유로운': 'from-emerald-900/60 to-orange-900/40',
  '감성적인': 'from-violet-900/60 to-indigo-900/40',
  '도전적인': 'from-rose-900/60 to-orange-900/40',
}

const MOOD_ACCENT: Record<CourseCardData['mood'], string> = {
  '여유로운': 'text-emerald-400 bg-emerald-400/10',
  '감성적인': 'text-violet-400 bg-violet-400/10',
  '도전적인': 'text-rose-400 bg-rose-400/10',
}

export default function RecommendationSection({ courses, onPress }: Props) {
  const today = new Date()
  const hour = today.getHours()
  const timeLabel =
    hour < 6 ? '새벽 라이딩' : hour < 12 ? '오전 라이딩' : hour < 18 ? '오후 라이딩' : '야간 라이딩'

  return (
    <div className="flex flex-col gap-3">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <Compass size={14} strokeWidth={1.5} className="text-[#FF5A00]" />
          <span className="text-sm font-bold text-white">오늘의 추천 코스</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-light text-white/30">
          <span className="flex items-center gap-1">
            <Thermometer size={10} strokeWidth={1.5} />22°
          </span>
          <span className="flex items-center gap-1">
            <Wind size={10} strokeWidth={1.5} />맑음
          </span>
          <span>{timeLabel}에 딱!</span>
        </div>
      </div>

      {/* 가로 스크롤 카드 */}
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {courses.map((course, i) => (
          <button
            key={course.id}
            onClick={() => onPress(course)}
            className="group relative shrink-0 w-52 h-36 overflow-hidden rounded-3xl transition-all duration-300 active:scale-[0.97]"
          >
            {/* 이미지 or 그라데이션 배경 */}
            {course.imageUrl ? (
              <img src={course.imageUrl} alt={course.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${MOOD_GRADIENT[course.mood]}`} />
            )}

            {/* 오버레이 */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />

            {/* 추천 순위 뱃지 */}
            <div className="absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF5A00] text-[10px] font-bold text-white">
              {i + 1}
            </div>

            {/* 무드 뱃지 */}
            <div className="absolute right-3 top-3">
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-light backdrop-blur-sm ${MOOD_ACCENT[course.mood]}`}>
                {course.mood}
              </span>
            </div>

            {/* 하단 정보 */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-left text-xs font-bold leading-snug text-white line-clamp-1">
                {course.title}
              </p>
              <p className="mt-0.5 text-left text-[10px] font-light text-white/50">
                {course.region} · {course.distanceKm}km
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
