// CourseCard.tsx
import { MapPin, Clock, Star } from 'lucide-react'
import type { TourCardData } from '../../components/TourCard'

export interface CourseCardData extends TourCardData {
  durationMin?: number
  rating?: number
  isMyRide?: boolean
}

const MOOD_COLOR: Record<TourCardData['mood'], string> = {
  '여유로운': 'text-emerald-400 bg-emerald-400/10',
  '감성적인': 'text-violet-400 bg-violet-400/10',
  '도전적인': 'text-rose-400 bg-rose-400/10',
}

const PRESET_PATHS = [
  'M 10 75 C 55 75 65 25 115 50 C 165 75 195 30 265 38',
  'M 10 60 L 60 35 L 105 68 L 155 28 L 205 58 L 265 48',
  'M 10 50 Q 65 18 115 52 Q 165 85 220 50 L 265 44',
  'M 10 70 C 80 70 78 28 138 38 C 198 48 215 20 265 28',
  'M 10 78 L 75 78 L 75 38 L 155 38 L 155 58 L 265 58',
]

function MiniMap({ courseId }: { courseId: string }) {
  const idx = courseId.charCodeAt(courseId.length - 1) % PRESET_PATHS.length
  const d = PRESET_PATHS[idx]

  return (
    <div className="relative h-[88px] w-full overflow-hidden rounded-t-3xl bg-[#0b1120]"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
      }}
    >
      <svg viewBox="0 0 275 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id={`glow-${courseId}`}>
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* glow trail */}
        <path d={d} fill="none" stroke="#2DD4BF" strokeWidth="6" strokeOpacity="0.12"
          strokeLinecap="round" strokeLinejoin="round" />
        {/* route line */}
        <path d={d} fill="none" stroke="#2DD4BF" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          filter={`url(#glow-${courseId})`} />
        {/* start dot */}
        <circle cx="10" cy={parseFloat(d.split(' ')[2])} r="3.5" fill="#2DD4BF" fillOpacity="0.5"
          stroke="#2DD4BF" strokeWidth="1" />
        {/* end dot */}
        <circle cx="265" cy={parseFloat(d.split(' ')[d.split(' ').length - 1])} r="4"
          fill="#2DD4BF" />
      </svg>
      {/* vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#161B26]/80" />
    </div>
  )
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={9}
          strokeWidth={1.5}
          className={i <= rating ? 'fill-teal-400 text-teal-400' : 'text-white/15'}
        />
      ))}
      <span className="ml-1 text-[9px] font-light text-white/30">{rating.toFixed(1)}</span>
    </div>
  )
}

interface Props {
  course: CourseCardData
  onPress: (c: CourseCardData) => void
}

export default function CourseCard({ course, onPress }: Props) {
  const duration = course.durationMin ?? Math.round(course.distanceKm / 60 * 60)
  const rating = course.rating ?? 4.0

  return (
    <button
      onClick={() => onPress(course)}
      className="group w-full overflow-hidden rounded-3xl bg-[#161B26]/60 backdrop-blur-xl transition-all duration-300 active:scale-[0.97]"
    >
      {course.imageUrl ? (
        <div className="relative h-[88px] w-full overflow-hidden">
          <img src={course.imageUrl} alt={course.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#161B26]/80" />
        </div>
      ) : (
        <MiniMap courseId={course.id} />
      )}

      <div className="px-3.5 pb-3.5 pt-2.5">
        <div className="mb-1 flex items-start justify-between gap-1">
          <p className="text-left text-[13px] font-bold leading-snug text-white line-clamp-1">
            {course.title}
          </p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-light ${MOOD_COLOR[course.mood]}`}>
            {course.mood}
          </span>
        </div>

        <div className="mb-2 flex items-center gap-2 text-[10px] font-light text-white/40">
          <span className="flex items-center gap-0.5">
            <MapPin size={9} strokeWidth={1.5} />
            {course.region}
          </span>
          <span>{course.distanceKm} km</span>
          <span className="flex items-center gap-0.5">
            <Clock size={9} strokeWidth={1.5} />
            {duration}분
          </span>
        </div>

        <StarRow rating={rating} />
      </div>
    </button>
  )
}
