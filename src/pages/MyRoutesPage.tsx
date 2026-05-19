// MyRoutesPage.tsx — 내 경로 메뉴 메인
import { useState, useEffect }     from 'react'
import { useNavigate }             from 'react-router-dom'
import { CheckCircle }             from 'lucide-react'
import { BADGES, RIDE_DIARY_TIER_META, type Tier } from '../constants/BadgesData'
import BadgeAchievementModal, { checkRideDiaryBadge } from '../components/BadgeAchievementModal'

import KoreaRouteMap      from './routes/KoreaRouteMap'
import RouteCard          from './routes/RouteCard'
import EditModal          from './routes/EditModal'
import ShareSheet         from './routes/ShareSheet'
import EmptyState         from './routes/EmptyState'
import RouteFab           from './routes/RouteFab'
import VideoCreatorSheet  from './routes/VideoCreatorSheet'
import { cityLabel, MOCK_SEED_KEY, MOCK_COURSES } from './routes/routeUtils'

import {
  loadCourses, updateCourse, deleteCourse, shareToCommunity,
  type SavedCourse,
} from '../lib/courseStorage'
import { saveDriveSession } from '../lib/driveSession'
import { loadNaviPref, getCourseNavWaypoints, splitIntoSegments } from './map/naviUtils'

const ORANGE = '#F97316'

export default function MyRoutesPage() {
  const navigate = useNavigate()

  const [courses,      setCourses]      = useState<SavedCourse[]>([])
  const [editTarget,   setEditTarget]   = useState<SavedCourse | null>(null)
  const [shareTarget,  setShareTarget]  = useState<SavedCourse | null>(null)
  const [videoTarget,  setVideoTarget]  = useState<SavedCourse | null>(null)
  const [toast,        setToast]        = useState('')

  const [badgeQueue, setBadgeQueue] = useState<Array<{ badgeId: string; tier: Tier }>>([])
  const currentBadge = badgeQueue[0] ?? null
  const dismissBadge = () => setBadgeQueue(prev => prev.slice(1))

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const stored = loadCourses()
    if (!localStorage.getItem(MOCK_SEED_KEY)) {
      const seeded = [...MOCK_COURSES, ...stored]
      localStorage.setItem('moto_my_courses', JSON.stringify(seeded))
      localStorage.setItem(MOCK_SEED_KEY, '1')
      setCourses(seeded)
    } else {
      setCourses(stored)
    }
  }, [])

  const handleDelete = (id: string) => {
    deleteCourse(id)
    setCourses(prev => prev.filter(c => c.id !== id))
  }

  const handleSave = (id: string, diary: string, photos: string[]) => {
    const partial: Partial<SavedCourse> = { diary }
    if (photos.length > 0) partial.coverPhoto = photos[0]
    updateCourse(id, partial)
    setCourses(prev => prev.map(c => c.id === id ? { ...c, ...partial } : c))
    setEditTarget(null)
    setToast('기록이 저장되었습니다')
    const { newlyUnlocked } = checkRideDiaryBadge()
    if (newlyUnlocked.length > 0) setBadgeQueue(newlyUnlocked)
  }

  const handleDrive = (course: SavedCourse) => {
    const naviType = loadNaviPref()
    const waypoints = getCourseNavWaypoints(course)
    if (waypoints.length < 1) return
    const segments = splitIntoSegments(waypoints, naviType)
    const session = {
      courseId: course.id, courseTitle: course.title,
      naviType, segments, currentSegmentIdx: 0,
      startedAt: new Date().toISOString(),
    }
    saveDriveSession(session)
    window.dispatchEvent(new CustomEvent('moto:startDrive', { detail: session }))
  }

  const handleShareConfirm = (id: string) => {
    shareToCommunity(id)
    setCourses(prev => prev.map(c =>
      c.id === id ? { ...c, communityShared: true, isShared: true } : c
    ))
    setShareTarget(null)
    window.dispatchEvent(new CustomEvent('moto:community-updated'))
    setToast('공유되었습니다')
  }

  const totalKm  = courses.reduce((s, c) => s + c.distanceKm, 0)
  const totalHr  = Math.round(courses.reduce((s, c) => s + c.durationMin, 0) / 60)

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: '#FFFBF7' }}>

      {/* ── 상단 히어로 영역 ── */}
      <div className="px-5 pb-5 pt-5">
        <p style={{ fontSize: 12, color: '#A8A29E', fontWeight: 500, marginBottom: 2 }}>
          My Routes
        </p>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1C0A00', letterSpacing: '-0.03em' }}>
          내 경로
        </h2>
      </div>

      {/* ── 요약 통계 ── */}
      {courses.length > 0 && (
        <div className="mx-5 mb-5 flex rounded-3xl overflow-hidden"
          style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
          {[
            { value: courses.length, label: '기록' },
            { value: `${totalKm.toFixed(0)}`, label: 'km' },
            { value: totalHr, label: '시간' },
          ].map(({ value, label }, i) => (
            <div key={label} className="flex-1 py-4 text-center" style={{
              borderRight: i < 2 ? '1px solid #F5F0EB' : 'none',
            }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: ORANGE, letterSpacing: '-0.02em' }}>
                {value}
              </p>
              <p style={{ fontSize: 11, color: '#A8A29E', marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── 전국 누적 동선 지도 ── */}
      <div className="mx-5 mb-5">
        <KoreaRouteMap courses={courses} />
      </div>

      {/* ── 경로 카드 목록 ── */}
      <div className="px-5">
        {courses.length === 0
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
      <div className={`pointer-events-none fixed bottom-28 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-2 rounded-full px-5 py-3 shadow-xl transition-all duration-300 ${
        toast ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`} style={{ background: ORANGE }}>
        <CheckCircle size={15} strokeWidth={2} color="white" />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{toast}</span>
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
        const meta = RIDE_DIARY_TIER_META[currentBadge.tier]
        const overridden = { ...base, name: meta.name, description: meta.description, icon: meta.icon }
        return (
          <BadgeAchievementModal badge={overridden} tier={currentBadge.tier} isOpen onClose={dismissBadge} />
        )
      })()}

      <RouteFab onNavigate={() => navigate('/route-planner')} />
    </div>
  )
}
