import { Clock, Gauge, MapPin, Bookmark } from 'lucide-react'

export interface Course {
  id: string
  title: string
  region: string
  distanceKm: number
  durationMin: number
  difficulty: 'easy' | 'medium' | 'hard'
  thumbnailUrl?: string
  isBookmarked?: boolean
}

const DIFFICULTY_LABEL: Record<Course['difficulty'], string> = {
  easy: '초급',
  medium: '중급',
  hard: '고급',
}

const DIFFICULTY_COLOR: Record<Course['difficulty'], string> = {
  easy: 'text-emerald-400',
  medium: 'text-amber-400',
  hard: 'text-rose-400',
}

interface CourseCardProps {
  course: Course
  onPress?: (course: Course) => void
  onBookmark?: (course: Course) => void
}

export default function CourseCard({ course, onPress, onBookmark }: CourseCardProps) {
  const handlePress = () => {
    console.log('[CourseCard] 코스 선택', course.id, course.title)
    onPress?.(course)
  }

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation()
    console.log('[CourseCard] 북마크 토글', course.id)
    onBookmark?.(course)
  }

  return (
    <button
      onClick={handlePress}
      className="group w-full rounded-3xl border border-white/5 bg-white/5 p-4 text-left transition-colors active:bg-white/10"
    >
      <div className="flex gap-4">
        {/* 썸네일 */}
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-800">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <MapPin size={24} strokeWidth={1.5} className="text-white/20" />
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <div className="mb-1 flex items-start justify-between gap-2">
              <h3 className="truncate text-sm font-bold text-white leading-snug">
                {course.title}
              </h3>
              <button
                onClick={handleBookmark}
                className="shrink-0 text-white/30 transition-colors hover:text-teal-400"
              >
                <Bookmark
                  size={16}
                  strokeWidth={1.5}
                  fill={course.isBookmarked ? 'currentColor' : 'none'}
                  className={course.isBookmarked ? 'text-teal-400' : ''}
                />
              </button>
            </div>

            <div className="flex items-center gap-1 text-xs font-light text-white/40">
              <MapPin size={10} strokeWidth={1.5} />
              <span>{course.region}</span>
            </div>
          </div>

          {/* 메타 정보 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs font-light text-white/50">
              <Gauge size={12} strokeWidth={1.5} />
              <span>{course.distanceKm}km</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-light text-white/50">
              <Clock size={12} strokeWidth={1.5} />
              <span>{course.durationMin}분</span>
            </div>
            <span
              className={`text-xs font-light ${DIFFICULTY_COLOR[course.difficulty]}`}
            >
              {DIFFICULTY_LABEL[course.difficulty]}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}
