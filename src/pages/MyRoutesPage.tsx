// MyRoutesPage.tsx — 내 경로 메뉴 메인 (상태 관리 + 레이아웃)
// UI 수정 → src/pages/routes/ 각 파일 / 로직 수정 → 이 파일
import { useState, useEffect }     from 'react'
import { useNavigate }             from 'react-router-dom'
import { CheckCircle }             from 'lucide-react'
import { BADGES, RIDE_DIARY_TIER_META, type Tier } from '../data/BadgesData'
import BadgeAchievementModal, { checkRideDiaryBadge } from '../components/BadgeAchievementModal'

// ── routes/ 서브 컴포넌트 ──────────────────────────────────────────────────
import KoreaRouteMap      from './routes/KoreaRouteMap'
import RouteCard          from './routes/RouteCard'
import EditModal          from './routes/EditModal'
import ShareSheet         from './routes/ShareSheet'
import EmptyState         from './routes/EmptyState'
import RouteFab           from './routes/RouteFab'
import VideoCreatorSheet  from './routes/VideoCreatorSheet'
import { cityLabel, MOCK_SEED_KEY, MOCK_COURSES } from './routes/routeUtils'

// ── 공용 서비스 ────────────────────────────────────────────────────────────
import {
  loadCourses, updateCourse, deleteCourse, shareToCommunity,
  type SavedCourse,
} from '../lib/courseStorage'

export default function MyRoutesPage() {
  const navigate = useNavigate()

  const [courses,      setCourses]      = useState<SavedCourse[]>([])
  const [editTarget,   setEditTarget]   = useState<SavedCourse | null>(null)
  const [shareTarget,  setShareTarget]  = useState<SavedCourse | null>(null)
  const [videoTarget,  setVideoTarget]  = useState<SavedCourse | null>(null)
  const [toast,        setToast]        = useState('')

  // 배지 달성 팝업 큐
  const [badgeQueue, setBadgeQueue] = useState<Array<{ badgeId: string; tier: Tier }>>([])
  const currentBadge = badgeQueue[0] ?? null
  const dismissBadge = () => setBadgeQueue(prev => prev.slice(1))

  // 토스트 3초 자동 소멸
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // 최초 1회 샘플 시딩
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

  // ── 핸들러 ────────────────────────────────────────────────────────────
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

  const handleShareConfirm = (id: string) => {
    shareToCommunity(id)
    setCourses(prev => prev.map(c =>
      c.id === id ? { ...c, communityShared: true, isShared: true } : c
    ))
    setShareTarget(null)
    window.dispatchEvent(new CustomEvent('moto:community-updated'))
    setToast('공유되었습니다')
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-5 pb-32">
      <div>
        <p className="text-xs font-light text-white/30">GPS 기록 보관함</p>
        <h2 className="text-xl font-bold text-white">내 경로</h2>
      </div>

      {/* 전국 누적 동선 지도 */}
      <KoreaRouteMap courses={courses} />

      {/* 요약 통계 */}
      {courses.length > 0 && (
        <div className="flex gap-3 rounded-3xl border border-white/5 bg-white/[0.03] px-5 py-4">
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-teal-400">{courses.length}</p>
            <p className="text-[10px] font-light text-white/30">총 기록</p>
          </div>
          <div className="w-px bg-white/5" />
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-teal-400">
              {courses.reduce((s, c) => s + c.distanceKm, 0).toFixed(0)}
            </p>
            <p className="text-[10px] font-light text-white/30">총 km</p>
          </div>
          <div className="w-px bg-white/5" />
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-teal-400">
              {Math.round(courses.reduce((s, c) => s + c.durationMin, 0) / 60)}
            </p>
            <p className="text-[10px] font-light text-white/30">총 시간(h)</p>
          </div>
        </div>
      )}

      {/* 카드 목록 */}
      {courses.length === 0
        ? <EmptyState />
        : (
          <div className="flex flex-col gap-3">
            {courses.map(c => (
              <RouteCard
                key={c.id}
                course={c}
                onDelete={handleDelete}
                onEdit={setEditTarget}
                onShare={setShareTarget}
                onVideoCreate={setVideoTarget}
              />
            ))}
          </div>
        )
      }

      {/* 토스트 */}
      <div className={`pointer-events-none fixed bottom-28 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-2 rounded-full bg-teal-400 px-5 py-3 shadow-xl shadow-teal-900/40 transition-all duration-300 ${
        toast ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}>
        <CheckCircle size={15} strokeWidth={2} className="text-slate-950" />
        <span className="text-sm font-bold text-slate-950">{toast}</span>
      </div>

      {/* 편집 모달 */}
      {editTarget && (
        <EditModal course={editTarget} onSave={handleSave} onClose={() => setEditTarget(null)} />
      )}

      {/* 영상 만들기 뷰 선택 시트 */}
      {videoTarget && (
        <VideoCreatorSheet
          course={videoTarget}
          onClose={() => setVideoTarget(null)}
        />
      )}

      {/* 커뮤니티 공유 컨펌 */}
      {shareTarget && (
        <ShareSheet
          title={cityLabel(shareTarget.gpxPoints)}
          onConfirm={() => handleShareConfirm(shareTarget.id)}
          onCancel={() => setShareTarget(null)}
        />
      )}

      {/* 배지 달성 팝업 */}
      {currentBadge && (() => {
        const base = BADGES.find(b => b.id === currentBadge.badgeId)
        if (!base) return null
        const meta     = RIDE_DIARY_TIER_META[currentBadge.tier]
        const overridden = { ...base, name: meta.name, description: meta.description, icon: meta.icon }
        return (
          <BadgeAchievementModal
            badge={overridden}
            tier={currentBadge.tier}
            isOpen={true}
            onClose={dismissBadge}
          />
        )
      })()}

      {/* 경로 작성 FAB */}
      <RouteFab onNavigate={() => navigate('/route-planner')} />
    </div>
  )
}
