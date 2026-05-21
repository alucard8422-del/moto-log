// CourseDetailModal.tsx — 추천 코스 상세 + 내비 연동 + 3초 카운트다운 + 별점 + 댓글
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, MapPin, Gauge, Map, Navigation, ThumbsUp, Bookmark, MessageCircle, Send, PenLine } from 'lucide-react'
import type { TourCardData } from './TourCard'
import { NAVI_OPTIONS, NAVI_STORAGE_KEY, type NavigationType } from '../types/ride'
import NavigationCountdownPopup from './NavigationCountdownPopup'
import {
  loadCourses, loadCommunityCourses, addComment,
  type CourseComment, type SavedCourse,
} from '../lib/courseStorage'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'

const MOOD_COLOR: Record<NonNullable<TourCardData['mood']>, string> = {
  '여유로운': 'bg-emerald-400/15 text-emerald-300',
  '감성적인': 'bg-violet-400/15 text-violet-300',
  '도전적인': 'bg-rose-400/15 text-rose-300',
}

// ── 딥링크 빌더 ──────────────────────────────────────────────────────────
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
  setTimeout(() => {
    if (opt) window.open(opt.fallback, '_blank')
  }, 1500)
}

// ── 따봉(추천) 버튼 — localStorage 영속 ─────────────────────────────────
function ThumbsUpButton({ courseId, initialCount }: { courseId: string; initialCount: number }) {
  const tk = `moto:thumbed:${courseId}`
  const ck = `moto:thumbCount:${courseId}`
  const [thumbed, setThumbed] = useState(() => localStorage.getItem(tk) === '1')
  const [count, setCount]     = useState(() => {
    const s = localStorage.getItem(ck)
    return s !== null ? parseInt(s) : initialCount
  })

  const toggle = () => {
    const next      = !thumbed
    const nextCount = Math.max(0, count + (next ? 1 : -1))
    localStorage.setItem(tk, next ? '1' : '0')
    localStorage.setItem(ck, String(nextCount))
    setThumbed(next)
    setCount(nextCount)
  }

  return (
    // 라벨 텍스트 제거 — 아이콘 + 숫자만
    <button onClick={toggle} className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 transition-transform active:scale-90">
      <ThumbsUp
        size={20}
        strokeWidth={1.5}
        className={thumbed ? 'fill-[#FF5A00] text-[#FF5A00]' : 'text-white/30'}
      />
      <span className={`text-sm font-bold tabular-nums ${thumbed ? 'text-[#FF5A00]' : 'text-white/30'}`}>
        {count.toLocaleString()}
      </span>
    </button>
  )
}

// ── 즐겨찾기 저장소 키 ────────────────────────────────────────────────────
export const SAVED_COURSES_KEY = 'moto:saved_courses'

export function loadSavedCourses(): TourCardData[] {
  try { return JSON.parse(localStorage.getItem(SAVED_COURSES_KEY) ?? '[]') } catch { return [] }
}

function addSavedCourse(course: TourCardData) {
  const list = loadSavedCourses().filter(c => c.id !== course.id)
  localStorage.setItem(SAVED_COURSES_KEY, JSON.stringify([course, ...list]))
}

function removeSavedCourse(id: string) {
  const list = loadSavedCourses().filter(c => c.id !== id)
  localStorage.setItem(SAVED_COURSES_KEY, JSON.stringify(list))
}

// ── 북마크(저장) 버튼 — 누르면 SavedTab에도 실제 저장 ──────────────────────
function BookmarkButton({
  courseId, initialCount, course,
}: {
  courseId: string
  initialCount: number
  course: TourCardData
}) {
  const lk = `moto:bookmarked:${courseId}`
  const ck = `moto:bookmarkCount:${courseId}`
  const [saved, setSaved] = useState(() => localStorage.getItem(lk) === '1')
  const [count, setCount] = useState(() => {
    const s = localStorage.getItem(ck)
    return s !== null ? parseInt(s) : initialCount
  })

  const toggle = () => {
    const next      = !saved
    const nextCount = Math.max(0, count + (next ? 1 : -1))
    localStorage.setItem(lk, next ? '1' : '0')
    localStorage.setItem(ck, String(nextCount))
    setSaved(next)
    setCount(nextCount)
    // 저장 코스 탭과 연동
    if (next) addSavedCourse(course)
    else      removeSavedCourse(courseId)
  }

  return (
    <button onClick={toggle} className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 transition-transform active:scale-90">
      <Bookmark
        size={20}
        strokeWidth={1.5}
        className={saved ? 'fill-amber-400 text-amber-400' : 'text-white/30'}
      />
      <span className={`text-sm font-bold tabular-nums ${saved ? 'text-amber-400' : 'text-white/30'}`}>
        {count.toLocaleString()}
      </span>
    </button>
  )
}

// ── 댓글 섹션 ────────────────────────────────────────────────────────────
function CommentsSection({ courseId }: { courseId: string }) {
  const [comments, setComments] = useState<CourseComment[]>(() => {
    return loadCourses().find((c) => c.id === courseId)?.comments ?? []
  })
  const [text, setText] = useState('')

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    addComment(courseId, trimmed)
    const updated = loadCourses().find((c) => c.id === courseId)
    setComments(updated?.comments ?? [])
    setText('')
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 헤더 */}
      <div className="flex items-center gap-1.5">
        <MessageCircle size={13} strokeWidth={1.5} className="text-white/30" />
        <span className="text-[11px] font-light text-white/40">
          댓글 {comments.length}
        </span>
      </div>

      {/* 댓글 목록 */}
      {comments.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-white/[0.03] p-3.5">
          {comments.map((c, i) => (
            <div key={c.id} className="flex flex-col gap-0.5">
              <p className="text-xs font-light leading-relaxed text-white/70">{c.text}</p>
              <p className="text-[9px] font-light text-white/25">
                {new Date(c.createdAt).toLocaleDateString('ko-KR', {
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              {i < comments.length - 1 && (
                <div className="mt-2 h-px bg-white/5" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs font-light text-white/20">첫 번째 댓글을 남겨보세요!</p>
      )}

      {/* 입력창 */}
      <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="댓글을 입력하세요..."
          maxLength={100}
          className="flex-1 bg-transparent text-xs font-light text-white/70 placeholder-white/20 outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="shrink-0 text-[#FF5A00] transition-colors disabled:text-white/20 active:scale-90"
        >
          <Send size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}

// ── Haversine 거리 (km) ──────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── 메인 모달 ────────────────────────────────────────────────────────────
interface CourseDetailModalProps {
  course: TourCardData
  onClose: () => void
  /** 커뮤니티 공유 코스의 실제 localStorage ID — 전달 시 별점·댓글 UI 활성화 */
  savedCourseId?: string
}

export default function CourseDetailModal({
  course,
  onClose,
  savedCourseId,
}: CourseDetailModalProps) {
  const navigate = useNavigate()

  const [naviType, setNaviType] = useState<NavigationType>(
    () => (localStorage.getItem(NAVI_STORAGE_KEY) as NavigationType) ?? 'tmap'
  )
  const [showCountdown, setShowCountdown] = useState(false)

  // ── 출발지 불일치 시트 ──
  const [showStartSheet,  setShowStartSheet]  = useState(false)
  const [startSheetOpen,  setStartSheetOpen]  = useState(false)
  const [gpsPos,          setGpsPos]          = useState<{ lat: number; lng: number } | null>(null)

  // 모달 열린 동안 배경 스크롤 잠금
  useBodyScrollLock()

  // ── 슬라이더 ──
  // imageUrl 단일 → 배열 (추후 multi-photo 확장 포인트)
  const photos        = course.imageUrl ? [course.imageUrl] : []
  const [slideIdx, setSlideIdx]   = useState(0)
  const [lightbox, setLightbox]   = useState(false)
  const touchX = useRef(0)
  const touchY = useRef(0)

  const onSliderTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX
    touchY.current = e.touches[0].clientY
  }
  const onSliderTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchX.current
    const dy = e.changedTouches[0].clientY - touchY.current
    if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 40) return
    if (dx < 0 && slideIdx < photos.length - 1) setSlideIdx(i => i + 1)
    if (dx > 0 && slideIdx > 0) setSlideIdx(i => i - 1)
  }

  useEffect(() => {
    const stored = localStorage.getItem(NAVI_STORAGE_KEY) as NavigationType | null
    if (stored) setNaviType(stored)
  }, [])

  const naviLabel = NAVI_OPTIONS.find((o) => o.type === naviType)?.label ?? 'T map'

  const handleNavigatePress = () => {
    if (!navigator.geolocation) { setShowCountdown(true); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setGpsPos({ lat, lng })

        if (savedCourseId) {
          const saved = loadCommunityCourses().find((c) => c.id === savedCourseId)
          if (saved && saved.gpxPoints.length > 0) {
            const start = saved.gpxPoints[0]
            if (haversineKm(lat, lng, start.lat, start.lng) <= 2) {
              setShowCountdown(true)
              return
            }
          }
        }
        // 출발지와 멀거나 코스 데이터 없음 → 연결 시트
        setShowStartSheet(true)
        setTimeout(() => setStartSheetOpen(true), 16)
      },
      () => { setShowCountdown(true) },
      { timeout: 5000, maximumAge: 30000 },
    )
  }

  const closeStartSheet = () => {
    setStartSheetOpen(false)
    setTimeout(() => setShowStartSheet(false), 400)
  }

  const handleEditRoute = () => {
    closeStartSheet()
    const importedWaypoints = (() => {
      if (!savedCourseId) return []
      const c = loadCommunityCourses().find(x => x.id === savedCourseId)
      return c?.plannerWaypoints ?? []
    })()
    navigate('/route-planner', { state: { importedWaypoints, userPos: gpsPos } })
  }

  const handleCountdownLaunch = () => {
    setShowCountdown(false)
    launchNavi(naviType, course.region)
  }
  const handleCountdownCancel = () => setShowCountdown(false)

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
          className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-2xl shadow-black/60 sm:rounded-3xl"
          style={{ maxHeight: '90dvh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── 썸네일 슬라이더 배너 (고정 헤더) ── */}
          <div
            className="relative h-44 w-full shrink-0 overflow-hidden rounded-t-3xl"
            onTouchStart={onSliderTouchStart}
            onTouchEnd={onSliderTouchEnd}
            onClick={() => photos.length > 0 && setLightbox(true)}
          >
            {/* 슬라이드 스트립 */}
            {photos.length > 0 ? (
              <div
                className="flex h-full transition-transform duration-300 ease-out"
                style={{
                  width: `${photos.length * 100}%`,
                  transform: `translateX(-${(slideIdx * 100) / photos.length}%)`,
                }}
              >
                {photos.map((url, i) => (
                  <div key={i} style={{ width: `${100 / photos.length}%` }} className="h-full shrink-0">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full w-full bg-slate-800" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent" />

            {/* 닫기 — stopPropagation으로 lightbox 트리거 방지 */}
            <button
              onClick={(e) => { e.stopPropagation(); onClose() }}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-950/60 text-white/50 backdrop-blur-sm hover:text-white/80"
            >
              <X size={14} strokeWidth={1.5} />
            </button>

            {/* 무드 배지 */}
            <div className="absolute left-4 top-4" onClick={e => e.stopPropagation()}>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-light backdrop-blur-sm ${MOOD_COLOR[course.mood]}`}>
                {course.mood}
              </span>
            </div>

            {/* 커뮤니티 배지 */}
            {savedCourseId && (
              <div className="absolute bottom-8 left-4" onClick={e => e.stopPropagation()}>
                <span className="rounded-full bg-[#FF5A00]/20 px-2.5 py-1 text-[10px] font-medium text-[#FF8040] backdrop-blur-sm">
                  🤝 커뮤니티 공유 코스
                </span>
              </div>
            )}

            {/* Dot 인디케이터 — 2장 이상일 때만 표시 */}
            {photos.length > 1 && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5" onClick={e => e.stopPropagation()}>
                {photos.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === slideIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── 스크롤 가능 본문 (스크롤바 완전 숨김) ── */}
          <div className="flex flex-col gap-5 overflow-y-auto px-5 pb-8 pt-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ overscrollBehavior: 'contain' }}>

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

            {/* ── 따봉 👍 + 북마크 🔖 피드백 바 ── */}
            <div className="flex items-stretch gap-0 rounded-2xl border border-white/5 bg-white/[0.03] px-2">
              <ThumbsUpButton
                courseId={course.id}
                initialCount={(course as unknown as { recommendCount?: number }).recommendCount ?? 0}
              />
              <div className="my-3 w-px bg-white/8" />
              <BookmarkButton
                courseId={course.id}
                initialCount={0}
                course={course}
              />
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

            {/* ── 커뮤니티 전용: 댓글 ── */}
            {savedCourseId && (
              <>
                <div className="h-px bg-white/5" />
                <CommentsSection courseId={savedCourseId} />
              </>
            )}

            {/* ── 주행 시작 버튼 ── */}
            <button
              onClick={handleNavigatePress}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A00] py-4 text-sm font-bold text-white transition-opacity active:opacity-80"
            >
              <Navigation size={16} strokeWidth={2} />
              바로 여행하기
            </button>
          </div>
        </div>
      </div>

      {/* 3초 카운트다운 팝업 */}
      <NavigationCountdownPopup
        isOpen={showCountdown}
        naviLabel={naviLabel}
        onLaunch={handleCountdownLaunch}
        onCancel={handleCountdownCancel}
      />

      {/* ── 출발지 연결 시트 ── */}
      {showStartSheet && (
        <>
          <div
            className={`fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${startSheetOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={closeStartSheet}
          />
          <div className={`fixed inset-x-0 bottom-0 z-[90] flex justify-center transition-transform duration-500 ease-out ${startSheetOpen ? 'translate-y-0' : 'translate-y-full'}`}>
            <div className="w-full max-w-sm rounded-t-3xl px-6 pb-10 pt-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />
              <div className="mb-1 text-[10px] font-light uppercase tracking-widest text-white/30">출발지 안내</div>
              <p className="mb-1 text-base font-bold text-white">작성자가 설정한 출발지와 현재 위치가 다릅니다</p>
              <p className="mb-5 text-sm font-light" style={{ color: 'var(--text-muted)' }}>경로를 수정하시겠습니까?</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleEditRoute}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white active:opacity-80"
                  style={{ background: 'var(--brand)' }}
                >
                  <PenLine size={15} strokeWidth={2} />
                  수정하기
                </button>
                <button
                  onClick={closeStartSheet}
                  className="w-full rounded-2xl py-3.5 text-sm font-light active:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 라이트박스 — 슬라이더 사진 탭 시 원본 확대 */}
      {lightbox && photos.length > 0 && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 backdrop-blur-sm"
          onClick={() => setLightbox(false)}
        >
          <img
            src={photos[slideIdx]}
            alt=""
            className="max-h-[85dvh] max-w-[95vw] rounded-2xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
