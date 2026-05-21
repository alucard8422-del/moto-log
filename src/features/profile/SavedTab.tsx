// SavedTab.tsx — 프로필 > 저장한 코스 탭
// 추천 코스에서 🔖 북마크 시 여기에 저장, "내 경로로 저장" 지원

import { useState } from 'react'
import { Bookmark, MapPin, Route, Clock, CheckCircle, Trash2 } from 'lucide-react'
import { loadSavedCourses, SAVED_COURSES_KEY } from '../../components/CourseDetailModal'
import { saveCourse } from '../../lib/courseStorage'
import type { TourCardData } from '../../components/TourCard'

function fmtDist(km: number) {
  return km >= 1 ? `${km.toFixed(0)}km` : `${(km * 1000).toFixed(0)}m`
}
function fmtDur(m: number) {
  if (!m) return '-'
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`
}

export default function SavedTab() {
  const [courses,   setCourses]  = useState<TourCardData[]>(loadSavedCourses)
  const [toastId,   setToastId]  = useState<string | null>(null)

  // 북마크 해제
  const handleRemove = (id: string) => {
    const next = courses.filter(c => c.id !== id)
    setCourses(next)
    localStorage.setItem(SAVED_COURSES_KEY, JSON.stringify(next))
    localStorage.setItem(`moto:bookmarked:${id}`, '0')
  }

  // 내 경로로 저장 (MyRoutesPage에 추가)
  const handleSaveToMyRoutes = (course: TourCardData) => {
    if (toastId === course.id) return   // 이미 저장됨

    const newCourse = {
      id:          crypto.randomUUID(),
      title:       course.title,
      distanceKm:  course.distanceKm ?? 0,
      durationMin: (course as any).durationMin ?? 0,
      gpxPoints:   [] as any[],
      gpxXml:      '',
      createdAt:   new Date().toISOString(),
      isShared:    false,
      coverPhoto:  course.imageUrl,
      diary:       course.description,
      plannerWaypoints: [],   // 계획 경로 없음
    }
    saveCourse(newCourse)
    setToastId(course.id)
    setTimeout(() => setToastId(null), 2500)
  }

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 pt-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
          <Bookmark size={32} strokeWidth={1.5} className="text-white/15" />
        </div>
        <p className="text-sm font-bold text-white/40">저장한 코스가 없어요</p>
        <p className="text-xs font-light text-white/20">
          추천 코스 상세 팝업에서 🔖 버튼을 누르면<br />여기에 모입니다
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {courses.map(course => (
          <div
            key={course.id}
            className="overflow-hidden rounded-[20px]"
            style={{
              background:           'var(--glass-bg)',
              backdropFilter:       'var(--glass-blur)',
              WebkitBackdropFilter: 'var(--glass-blur)',
              border:               '1px solid var(--glass-border)',
              boxShadow:            'var(--glass-shadow)',
            }}
          >
            {/* 커버 이미지 */}
            {course.imageUrl && (
              <div className="relative h-32 w-full overflow-hidden">
                <img src={course.imageUrl} alt={course.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <p className="absolute bottom-3 left-4 text-[14px] font-bold text-white">{course.title}</p>
              </div>
            )}

            <div className="px-4 pb-4 pt-3">
              {!course.imageUrl && (
                <p className="mb-2 text-[14px] font-bold text-main">{course.title}</p>
              )}

              {/* 통계 */}
              <div className="mb-3 flex items-center gap-3 text-[11px] text-sub">
                <span className="flex items-center gap-1">
                  <MapPin size={10} strokeWidth={1.5} className="text-muted" />
                  {course.region}
                </span>
                {course.distanceKm > 0 && (
                  <span className="flex items-center gap-1">
                    <Route size={10} strokeWidth={1.5} className="text-muted" />
                    {fmtDist(course.distanceKm)}
                  </span>
                )}
                {(course as any).durationMin > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock size={10} strokeWidth={1.5} className="text-muted" />
                    {fmtDur((course as any).durationMin)}
                  </span>
                )}
              </div>

              {/* 설명 */}
              {course.description && (
                <p className="mb-3 line-clamp-2 text-[12px] font-light text-muted">{course.description}</p>
              )}

              {/* 액션 버튼 */}
              <div className="flex gap-2">
                {/* 북마크 해제 */}
                <button
                  onClick={() => handleRemove(course.id)}
                  className="flex items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-light text-red-400 active:opacity-70"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  <Trash2 size={11} strokeWidth={1.5} />
                  삭제
                </button>

                {/* 내 경로로 저장 */}
                <button
                  onClick={() => handleSaveToMyRoutes(course)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-bold active:opacity-70"
                  style={
                    toastId === course.id
                      ? { background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e' }
                      : { background: 'var(--brand-soft)', border: '1px solid color-mix(in srgb, var(--brand) 25%, transparent)', color: 'var(--brand)' }
                  }
                >
                  {toastId === course.id
                    ? <><CheckCircle size={11} strokeWidth={2} />저장됨</>
                    : '내 경로로 저장'
                  }
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
