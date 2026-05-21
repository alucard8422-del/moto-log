// SmartRecommendSection.tsx — GPS + 성향 분석 기반 개인 맞춤 추천 엔진
import { useState, useEffect } from 'react'
import { Cpu, MapPin, Loader } from 'lucide-react'
import { loadCourses, type SavedCourse } from '../../lib/courseStorage'
import type { CourseCardData } from './CourseCard'

type RiderType = 'light' | 'longdistance' | 'commuter' | 'unknown'

interface RiderProfile {
  type: RiderType
  label: string
  headline: string    // 헤더 강조 문구 (굵게)
  sub: string         // 부제 설명
  minDur: number
  maxDur: number
}

const PROFILES: Record<RiderType, RiderProfile> = {
  light: {
    type: 'light',
    label: '주말 숏코스 라이더',
    headline: '주말 성향을 저격한 맞춤 코스',
    sub: '가볍게 달리기 좋은 짧고 알찬 루트를 골라봤어요',
    minDur: 50, maxDur: 150,
  },
  longdistance: {
    type: 'longdistance',
    label: '롱디 라이더',
    headline: '묵직한 장거리 투어 성향 코스',
    sub: '하루 종일 달릴 수 있는 대형 루트만 선별했어요',
    minDur: 90, maxDur: 999,
  },
  commuter: {
    type: 'commuter',
    label: '평일 밤바리 라이더',
    headline: '칼퇴 후 바람 쐬기 딱 좋은 코스',
    sub: '짧지만 스트레스 날려줄 탄탄한 루트예요',
    minDur: 0, maxDur: 80,
  },
  unknown: {
    type: 'unknown',
    label: '라이더',
    headline: '지금 이 시간, 가장 핫한 코스',
    sub: '오늘 날씨와 시간대에 맞는 인기 루트를 모아봤어요',
    minDur: 0, maxDur: 999,
  },
}

function analyzeRiderType(logs: SavedCourse[]): RiderType {
  if (logs.length < 2) return 'unknown'
  let weekendCount = 0, weekdayCount = 0, totalDur = 0
  logs.forEach((c) => {
    const day = new Date(c.createdAt).getDay()
    if (day === 0 || day === 6) weekendCount++
    else weekdayCount++
    totalDur += c.durationMin
  })
  const avgDur = totalDur / logs.length
  const isWeekend = weekendCount >= weekdayCount
  if (!isWeekend && avgDur <= 60)   return 'commuter'
  if (isWeekend  && avgDur >= 240)  return 'longdistance'
  if (isWeekend  && avgDur <  240)  return 'light'
  return 'unknown'
}

export type RankedCourse = CourseCardData & { recommendCount: number }

function pickRecommended(courses: RankedCourse[], profile: RiderProfile, limit: number): RankedCourse[] {
  const filtered = courses
    .filter((c) => { const d = c.durationMin ?? 0; return d >= profile.minDur && d <= profile.maxDur })
    .sort((a, b) => b.recommendCount - a.recommendCount)
    .slice(0, limit)
  return filtered.length >= 2
    ? filtered
    : [...courses].sort((a, b) => b.recommendCount - a.recommendCount).slice(0, limit)
}

const MOOD_CHIP: Record<CourseCardData['mood'], string> = {
  '여유로운': 'text-emerald-400 bg-emerald-400/15',
  '감성적인': 'text-violet-400 bg-violet-400/15',
  '도전적인': 'text-rose-400   bg-rose-400/15',
}

interface Props {
  courses: RankedCourse[]
  onPress: (c: CourseCardData) => void
  limit?: number   // 최대 표시 개수 (기본 3)
}

export default function SmartRecommendSection({ courses, onPress, limit = 3 }: Props) {
  const [profile, setProfile] = useState<RiderProfile>(PROFILES.unknown)
  const [picks, setPicks]     = useState<RankedCourse[]>([])
  const [locLabel, setLocLabel] = useState<string | null>(null)
  const [loading, setLoading]  = useState(true)

  useEffect(() => {
    const logs       = loadCourses()
    const riderType  = analyzeRiderType(logs)
    const prof       = PROFILES[riderType]
    setProfile(prof)
    setPicks(pickRecommended(courses, prof, limit))

    if (!navigator.geolocation) { setLoading(false); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        setLocLabel(lat >= 37.5 ? '수도권 근교' : lat >= 35.5 ? '충청·전라권' : '경상·제주권')
        setLoading(false)
      },
      () => setLoading(false),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    )
  }, [courses, limit])

  if (picks.length === 0) return null

  return (
    <div className="flex flex-col gap-4">

      {/* ── 헤더 ── */}
      <div className="flex flex-col gap-1.5 px-0.5">
        {/* 라벨 + GPS */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Cpu size={13} strokeWidth={1.5} className="text-[#FF5A00]" />
            <span className="text-[10px] font-medium uppercase tracking-widest text-[#FF5A00]/80">
              AI 맞춤 추천
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-light text-white/30">
            {loading
              ? <Loader size={9} strokeWidth={1.5} className="animate-spin text-[#FF5A00]/50" />
              : <MapPin size={9} strokeWidth={1.5} className="text-[#FF5A00]/50" />}
            <span>{locLabel ?? '위치 확인 중'}</span>
          </div>
        </div>

        {/* 퍼소나 타이틀 */}
        <p className="text-lg font-bold leading-snug text-white">
          {profile.headline}
        </p>
        <p className="text-[11px] font-light text-white/40">{profile.sub}</p>
      </div>

      {/* ── 가로 스크롤 캐러셀 — 카드 3장 ── */}
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {picks.map((course, i) => (
          <button
            key={course.id}
            onClick={() => onPress(course)}
            className="group relative h-44 w-64 shrink-0 overflow-hidden rounded-3xl transition-all duration-300 active:scale-[0.97]"
          >
            {course.imageUrl
              ? <img src={course.imageUrl} alt={course.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              : <div className="absolute inset-0 bg-slate-800" />}

            {/* 오버레이 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />

            {/* 순위 뱃지 */}
            <div className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#FF5A00] text-[11px] font-bold text-white shadow-lg">
              {i + 1}
            </div>

            {/* 무드 칩 */}
            <div className="absolute right-3 top-3">
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium backdrop-blur-sm ${MOOD_CHIP[course.mood]}`}>
                {course.mood}
              </span>
            </div>

            {/* 하단 정보 */}
            <div className="absolute bottom-0 inset-x-0 p-4">
              <p className="text-left text-sm font-bold leading-snug text-white line-clamp-1">
                {course.title}
              </p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-[11px] font-light text-white/50">
                  {course.region} · {course.distanceKm}km
                </p>
                <span className="text-[10px] font-light text-[#FF5A00]/70">
                  ♥ {course.recommendCount}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
