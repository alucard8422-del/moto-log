import { X, MapPin, Gauge, Map, Navigation } from 'lucide-react'
import type { TourCardData } from './TourCard'

const MOOD_COLOR: Record<NonNullable<TourCardData['mood']>, string> = {
  '여유로운': 'bg-emerald-400/15 text-emerald-300',
  '감성적인': 'bg-violet-400/15 text-violet-300',
  '도전적인': 'bg-rose-400/15 text-rose-300',
}

interface CourseDetailModalProps {
  course: TourCardData
  onClose: () => void
}

export default function CourseDetailModal({ course, onClose }: CourseDetailModalProps) {
  const handleNavigate = () => {
    console.log('[CourseDetailModal] 카카오내비 주행 시작:', course.id, course.title)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={onClose}
    >
      {/* 딤드 백드롭 */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />

      {/* 모달 패널 */}
      <div
        className="relative flex w-full max-w-sm flex-col rounded-t-3xl border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-2xl shadow-black/60 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 썸네일 or 플레이스홀더 — 상단 이미지 배너 */}
        <div className="relative h-44 w-full overflow-hidden rounded-t-3xl sm:rounded-t-3xl">
          {course.imageUrl ? (
            <img
              src={course.imageUrl}
              alt={course.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-slate-800" />
          )}
          {/* 이미지 위 그라데이션 */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent" />

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-950/60 text-white/50 backdrop-blur-sm hover:text-white/80"
          >
            <X size={14} strokeWidth={1.5} />
          </button>

          {/* 무드 배지 */}
          <div className="absolute left-4 top-4">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-light backdrop-blur-sm ${MOOD_COLOR[course.mood]}`}>
              {course.mood}
            </span>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex flex-col gap-5 px-5 pb-6 pt-4">

          {/* ── 헤더: 코스명 + 메타 ── */}
          <div>
            <h2 className="text-2xl font-bold leading-tight text-white">{course.title}</h2>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs font-light text-white/40">
                <MapPin size={11} strokeWidth={1.5} />
                {course.region}
              </span>
              {course.distanceKm > 0 && (
                <span className="flex items-center gap-1 text-xs font-light text-white/40">
                  <Gauge size={11} strokeWidth={1.5} />
                  {course.distanceKm} km
                </span>
              )}
            </div>
          </div>

          {/* ── 지도 자리 ── */}
          <div className="flex h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-white/5 bg-slate-950/50">
            <Map size={28} strokeWidth={1.5} className="text-white/20" />
            <p className="text-xs font-light text-white/25">지도 데이터 로딩 중...</p>
          </div>

          {/* ── 설명 ── */}
          {course.description ? (
            <p className="text-sm font-light leading-relaxed text-white/55">
              {course.description}
            </p>
          ) : (
            <p className="text-sm font-light text-white/25">등록된 설명이 없습니다.</p>
          )}

          {/* ── 태그 ── */}
          {course.tags && course.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {course.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-light text-white/45"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* ── 주행 시작 버튼 ── */}
          <button
            onClick={handleNavigate}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-400 py-4 text-sm font-bold text-slate-950 transition-opacity active:opacity-80"
          >
            <Navigation size={16} strokeWidth={2} />
            카카오내비로 주행 시작
          </button>
        </div>
      </div>
    </div>
  )
}
