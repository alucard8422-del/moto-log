// MyRoutesPage.tsx — 내 경로 메뉴 메인
import { useState, useEffect }     from 'react'
import { useModalBackButton }      from '../../hooks/useModalBackButton'
import { CheckCircle }             from 'lucide-react'
import { BADGES, RIDE_DIARY_TIER_META, type Tier } from '../../constants/BadgesData'
import BadgeAchievementModal, { checkRideDiaryBadge } from '../../components/BadgeAchievementModal'

import KoreaRouteMap      from './routes/KoreaRouteMap'
import RouteCard          from './routes/RouteCard'
import EditModal          from './routes/EditModal'
import ShareSheet         from './routes/ShareSheet'
import EmptyState         from './routes/EmptyState'
import VideoCreatorSheet  from './routes/VideoCreatorSheet'
import MyRoutesController from './MyRoutesController'
import { cityLabel, MOCK_SEED_KEY, MOCK_COURSES } from './routes/routeUtils'

import {
  loadCourses, updateCourse, deleteCourse, shareToCommunity,
  type SavedCourse,
} from '../../lib/courseStorage'
import {
  fetchMyCoursesAuth, insertMyCourse, updateMyCourse, deleteMyCourse, uploadCourseImage,
} from '../../lib/courseService'
import { saveDriveSession } from '../../lib/driveSession'
import { loadNaviPref, getCourseNavWaypoints, splitIntoSegments } from '../../lib/naviUtils'

export default function MyRoutesPage() {
  const [courses,     setCourses]     = useState<SavedCourse[]>([])
  const [isLoading,   setIsLoading]   = useState(true)
  const [editTarget,  setEditTarget]  = useState<SavedCourse | null>(null)
  const [shareTarget, setShareTarget] = useState<SavedCourse | null>(null)
  const [videoTarget, setVideoTarget] = useState<SavedCourse | null>(null)
  const [toast,       setToast]       = useState('')

  const [badgeQueue, setBadgeQueue] = useState<Array<{ badgeId: string; tier: Tier }>>([])
  const currentBadge = badgeQueue[0] ?? null
  const dismissBadge = () => setBadgeQueue(prev => prev.slice(1))

  // 뒤로가기로 모달/시트 닫기
  const anyModalOpen = editTarget !== null || shareTarget !== null || videoTarget !== null
  useModalBackButton(anyModalOpen, () => {
    setEditTarget(null)
    setShareTarget(null)
    setVideoTarget(null)
  })

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    // useEffect 콜백은 async 불가 → 내부 async 함수로 분리
    const loadData = async () => {
      setIsLoading(true)
      try {
        const { courses: serverCourses, loggedIn } = await fetchMyCoursesAuth()

        if (loggedIn) {
          console.log('🎯 서버에서 최종 수신한 코스 데이터:', serverCourses)

          // ✅ 로그인 상태: 서버가 항상 기준 (0개여도 서버 기준 유지)
          setCourses(serverCourses)
          console.log(`[MyRoutesPage] ✅ 서버 기준 로드 완료 — ${serverCourses.length}개`)
        } else {
          // ℹ️ 미로그인: 로컬 폴백
          console.log('[MyRoutesPage] ℹ️ 미로그인 — 로컬 데이터 사용')
          const stored = loadCourses()
          if (!localStorage.getItem(MOCK_SEED_KEY)) {
            const seeded = [...MOCK_COURSES, ...stored]
            localStorage.setItem('moto_my_courses', JSON.stringify(seeded))
            localStorage.setItem(MOCK_SEED_KEY, '1')
            setCourses(seeded)
          } else {
            setCourses(stored)
          }
        }
      } catch (e) {
        console.error('[MyRoutesPage] ❌ 데이터 로드 오류:', e)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const handleDelete = (id: string) => {
    deleteCourse(id)                        // 로컬 먼저
    setCourses(prev => prev.filter(c => c.id !== id))
    deleteMyCourse(id)                      // 서버 동기화
      .then(ok => {
        if (!ok) console.warn('[MyRoutesPage] ⚠️ 서버 삭제 실패 — 로컬에서는 삭제됨')
        else console.log('[MyRoutesPage] ✅ 서버 삭제 완료 — id:', id)
      })
      .catch(e => console.error('[MyRoutesPage] ❌ 서버 삭제 오류:', e))
  }

  const handleSave = (id: string, diary: string, photos: string[]) => {
    // ── [1단계] 로컬 선저장 — 서버 결과와 무관하게 즉시 화면 반영 ──────────
    const localPartial: Partial<SavedCourse> = { diary }
    if (photos.length > 0) localPartial.coverPhoto = photos[0]   // base64 로컬 표시용

    updateCourse(id, localPartial)
    setCourses(prev => prev.map(c => c.id === id ? { ...c, ...localPartial } : c))
    setEditTarget(null)
    setToast('기록이 저장되었습니다')
    const { newlyUnlocked } = checkRideDiaryBadge()
    if (newlyUnlocked.length > 0) setBadgeQueue(newlyUnlocked)

    // ── [2단계] 서버 동기화 — 전체 코스 upsert (UPDATE 불확실성 제거) ──────
    ;(async () => {
      try {
        const fullCourse = courses.find(c => c.id === id)
        if (!fullCourse) {
          console.warn('[MyRoutesPage] ⚠️ 코스를 메모리에서 찾을 수 없음 — id:', id)
          return
        }

        // 사진 업로드 (있을 경우)
        let finalCoverPhoto = fullCourse.coverPhoto
        if (photos.length > 0) {
          console.log('[MyRoutesPage] 사진 압축 및 Storage 업로드 시작...')
          const publicUrl = await uploadCourseImage(photos[0], id)
          if (publicUrl) {
            finalCoverPhoto = publicUrl
            updateCourse(id, { coverPhoto: publicUrl })
            setCourses(prev => prev.map(c => c.id === id ? { ...c, coverPhoto: publicUrl } : c))
          } else {
            console.warn('[MyRoutesPage] ⚠️ Storage 업로드 실패 — 사진은 로컬(base64)에만 보존됨')
          }
        }

        // 전체 코스에 diary 병합 후 upsert (코스 존재 여부 무관)
        const merged: SavedCourse = { ...fullCourse, diary, coverPhoto: finalCoverPhoto }
        const ok = await insertMyCourse(merged)
        if (ok) console.log('[MyRoutesPage] ✅ 서버 저장 완료 — id:', id)
        else    console.warn('[MyRoutesPage] ⚠️ 서버 저장 실패 — 로컬에만 저장됨')

      } catch (e) {
        console.error('🚨 [치명적 저장 에러]: handleSave 서버 동기화 실패\n  로컬에는 정상 저장됨\n  원인:', e)
      }
    })()
  }

  const handleDrive = (course: SavedCourse) => {
    const naviType  = loadNaviPref()
    const waypoints = getCourseNavWaypoints(course)
    if (waypoints.length < 1) return
    const segments  = splitIntoSegments(waypoints, naviType)
    const session   = {
      courseId: course.id, courseTitle: course.title,
      naviType, segments, currentSegmentIdx: 0,
      startedAt: new Date().toISOString(),
    }
    saveDriveSession(session)
    window.dispatchEvent(new CustomEvent('moto:startDrive', { detail: session }))
  }

  const handleShareConfirm = (id: string) => {
    shareToCommunity(id)                                    // 로컬
    updateMyCourse(id, { communityShared: true })           // 서버 (fire-and-forget)
    setCourses(prev => prev.map(c =>
      c.id === id ? { ...c, communityShared: true, isShared: true } : c
    ))
    setShareTarget(null)
    window.dispatchEvent(new CustomEvent('moto:community-updated'))
    setToast('공유되었습니다')
  }

  const totalKm = courses.reduce((s, c) => s + c.distanceKm, 0)
  const totalHr = Math.round(courses.reduce((s, c) => s + c.durationMin, 0) / 60)

  return (
    <div className="min-h-screen bg-app pb-32">

      {/* ── 상단 ── */}
      <div className="px-5 pb-5 pt-6">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted">My Routes</p>
        <h2 className="text-[28px] font-extrabold tracking-tight text-main">내 경로</h2>
      </div>

      {/* ── 전국 누적 동선 지도 ── */}
      <div className="mx-5 mb-5">
        <KoreaRouteMap courses={courses} isLoading={isLoading} />
      </div>

      {/* ── 요약 통계 ── */}
      {courses.length > 0 && (
        <div
          className="mx-5 mb-5 flex overflow-hidden rounded-3xl"
          style={{
            background:            'var(--glass-bg)',
            backdropFilter:        'var(--glass-blur)',
            WebkitBackdropFilter:  'var(--glass-blur)',
            border:                '1px solid var(--glass-border)',
            boxShadow:             'var(--glass-shadow)',
          }}
        >
          {[
            { value: courses.length,          label: '기록'  },
            { value: totalKm.toFixed(0),       label: 'km'   },
            { value: totalHr,                  label: '시간'  },
          ].map(({ value, label }, i) => (
            <div
              key={label}
              className="flex-1 py-5 text-center"
              style={{ borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}
            >
              <p className="text-[24px] font-extrabold tracking-tight text-brand">{value}</p>
              <p className="mt-0.5 text-[11px] font-medium text-muted">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── 경로 카드 목록 ── */}
      <div className="px-5">
        {isLoading
          ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              <p className="text-xs">서버에서 불러오는 중...</p>
            </div>
          )
          : courses.length === 0
          ? <EmptyState />
          : (
            <div className="flex flex-col gap-4">
              {courses.map(c => (
                <RouteCard
                  key={c.id}
                  course={c}
                  onDelete={handleDelete}
                  onEdit={setEditTarget}
                  onShare={setShareTarget}
                  onVideoCreate={setVideoTarget}
                  onDrive={handleDrive}
                />
              ))}
            </div>
          )
        }
      </div>

      {/* ── 토스트 ── */}
      <div
        className={`pointer-events-none fixed bottom-28 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-2 rounded-full bg-brand px-5 py-3 shadow-xl transition-all duration-300 ${
          toast ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        <CheckCircle size={15} strokeWidth={2} color="white" />
        <span className="text-[13px] font-bold text-white">{toast}</span>
      </div>

      {editTarget && (
        <EditModal course={editTarget} onSave={handleSave} onClose={() => setEditTarget(null)} />
      )}
      {videoTarget && (
        <VideoCreatorSheet course={videoTarget} onClose={() => setVideoTarget(null)} />
      )}
      {shareTarget && (
        <ShareSheet
          title={cityLabel(shareTarget.gpxPoints)}
          onConfirm={() => handleShareConfirm(shareTarget.id)}
          onCancel={() => setShareTarget(null)}
        />
      )}
      {currentBadge && (() => {
        const base = BADGES.find(b => b.id === currentBadge.badgeId)
        if (!base) return null
        const meta       = RIDE_DIARY_TIER_META[currentBadge.tier]
        const overridden = { ...base, name: meta.name, description: meta.description, icon: meta.icon }
        return <BadgeAchievementModal badge={overridden} tier={currentBadge.tier} isOpen onClose={dismissBadge} />
      })()}

      <MyRoutesController />
    </div>
  )
}
