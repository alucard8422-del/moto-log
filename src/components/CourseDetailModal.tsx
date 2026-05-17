// CourseDetailModal.tsx — 추천 코스 상세 + 내비 연동 + 3초 카운트다운
import { useState, useEffect } from 'react'
import { X, MapPin, Gauge, Map, Navigation } from 'lucide-react'
import type { TourCardData } from './TourCard'
import { NAVI_OPTIONS, NAVI_STORAGE_KEY, type NavigationType } from '../pages/map/types'
import NavigationCountdownPopup from './NavigationCountdownPopup'

const MOOD_COLOR: Record<NonNullable<TourCardData['mood']>, string> = {
  '여유로운': 'bg-emerald-400/15 text-emerald-300',
  '감성적인': 'bg-violet-400/15 text-violet-300',
  '도전적인': 'bg-rose-400/15 text-rose-300',
}

// 딥링크 빌더 — 목적지를 코스 지역명으로 검색
function buildDeepLink(type: NavigationType, region: string): string {
  const encoded = encodeURIComponent(region)
  switch (type) {
    case 'tmap':  return `tmap://search?name=${encoded}`
    case 'kakao': return `kakaonavi://search?name=${encoded}`
    case 'atlan': return `atlan://search?name=${encoded}`
  }
}

function launchNavi(type: NavigationType, region: string) {
  const opt = NAVI_OPTIONS.find((o) => o.type === type)
  window.location.href = buildDeepLink(type, region)
  // 앱 미설치 시 스토어 fallback
  setTimeout(() => {
    if (opt) window.open(opt.fallback, '_blank')
  }, 1500)
}

interface CourseDetailModalProps {
  course: TourCardData
  onClose: () => void
}

export default function CourseDetailModal({ course, onClose }: CourseDetailModalProps) {
  // 프로필에서 저장한 내비 설정 읽기 (localStorage 동기 초기값)
  const [naviType, setNaviType] = useState<NavigationType>(
    () => (localStorage.getItem(NAVI_STORAGE_KEY) as NavigationType) ?? 'tmap'
  )
  const [showCountdown, setShowCountdown] = useState(false)

  // 프로필 탭에서 설정이 바뀐 경우 모달이 열릴 때마다 최신값 반영
  useEffect(() => {
    const stored = localStorage.getItem(NAVI_STORAGE_KEY) as NavigationType | null
    if (stored) setNaviType(stored)
  }, [])

  const naviLabel = NAVI_OPTIONS.find((o) => o.type === naviType)?.label ?? 'T map'

  const handleNavigatePress = () => {
    setShowCountdown(true)
  }

  const handleCountdownLaunch = () => {
    setShowCountdown(false)
    launchNavi(naviType, course.region)
  }

  const handleCountdownCancel = () => {
    setShowCountdown(false)
  }

  return (
    <>
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
          {/* 썸네일 배너 */}
          <div className="relative h-44 w-full overflow-hidden rounded-t-3xl">
            {course.imageUrl ? (
              <img
                src={course.imageUrl}
                alt={course.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-slate-800" />
            )}
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

            {/* 헤더 */}
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

            {/* 지도 자리 */}
            <div className="flex h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-white/5 bg-slate-950/50">
              <Map size={28} strokeWidth={1.5} className="text-white/20" />
              <p className="text-xs font-light text-white/25">지도 데이터 로딩 중...</p>
            </div>

            {/* 설명 */}
            {course.description ? (
              <p className="text-sm font-light leading-relaxed text-white/55">
                {course.description}
              </p>
            ) : (
              <p className="text-sm font-light text-white/25">등록된 설명이 없습니다.</p>
            )}

            {/* 태그 */}
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

            {/* ── 주행 시작 버튼 (동적 내비 라벨) ── */}
            <button
              onClick={handleNavigatePress}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-400 py-4 text-sm font-bold text-slate-950 transition-opacity active:opacity-80"
            >
              <Navigation size={16} strokeWidth={2} />
              {naviLabel}로 주행 시작
            </button>
          </div>
        </div>
      </div>

      {/* 3초 카운트다운 팝업 — z-[70] 이므로 모달(z-50) 위에 렌더링 */}
      <NavigationCountdownPopup
        isOpen={showCountdown}
        naviLabel={naviLabel}
        onLaunch={handleCountdownLaunch}
        onCancel={handleCountdownCancel}
      />
    </>
  )
}
