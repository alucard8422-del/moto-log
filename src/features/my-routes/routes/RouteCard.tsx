// RouteCard.tsx — 내 경로 > 주행 기록 카드
import { useState } from 'react'
import { Route, Clock, MapPin, Pencil, Share2, CheckCircle, Trash2, Clapperboard, FileDown, Play, Navigation } from 'lucide-react'
import { cityLabel, fmtDist, fmtDur, fmtDate } from './routeUtils'
import DeleteModal from './DeleteModal'
import type { SavedCourse } from '../../../lib/courseStorage'

interface Props {
  course:         SavedCourse
  onDelete:       (id: string) => void
  onEdit:         (course: SavedCourse) => void
  onShare:        (course: SavedCourse) => void
  onVideoCreate?: (course: SavedCourse) => void
  onDrive?:       (course: SavedCourse) => void
}

export default function RouteCard({ course, onDelete, onEdit, onShare, onVideoCreate, onDrive }: Props) {
  const label      = cityLabel(course.gpxPoints)
  const hasGpx     = !!course.gpxXml && course.gpxXml.length > 50
  // 경로 작성(RoutePlanner)으로 저장된 계획 경로 — 모의주행·영상·GPX 뱃지 숨김
  const isPlanned  = Array.isArray(course.plannerWaypoints) && course.plannerWaypoints.length > 0
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onEdit(course)}
        className="w-full cursor-pointer overflow-hidden transition-opacity active:opacity-90"
        style={{
          borderRadius:          'var(--card-radius)',
          background:            'var(--glass-bg)',
          backdropFilter:        'var(--glass-blur)',
          WebkitBackdropFilter:  'var(--glass-blur)',
          border:                '1px solid var(--glass-border)',
          boxShadow:             'var(--glass-shadow)',
        }}
      >
        {/* ── 커버 이미지 ── */}
        <div className="relative h-44 w-full overflow-hidden">
          {course.coverPhoto
            ? <img src={course.coverPhoto} className="h-full w-full object-cover" alt="" />
            : (
              <div
                className="flex h-full w-full items-center justify-center bg-elevated"
                style={{ background: 'linear-gradient(135deg, var(--bg-elevated) 0%, color-mix(in srgb, var(--brand) 8%, var(--bg-elevated)) 100%)' }}
              >
                <MapPin size={32} strokeWidth={1} style={{ color: 'var(--brand-muted)', opacity: 0.5 }} />
              </div>
            )
          }

          {/* 사진 있을 때 하단 그라디언트 */}
          {course.coverPhoto && (
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)' }} />
          )}

          {/* ── 우상단 액션 버튼 ── */}
          <div className="absolute right-3 top-3 z-10 flex gap-1.5">
            {[
              {
                onClick: () => onEdit(course),
                icon: <Pencil size={13} strokeWidth={1.8} className="text-sub" />,
                active: false,
              },
              {
                onClick: () => { if (!course.communityShared) onShare(course) },
                icon: course.communityShared
                  ? <CheckCircle size={13} strokeWidth={2} className="text-brand" />
                  : <Share2 size={13} strokeWidth={1.8} className="text-sub" />,
                active: course.communityShared,
                disabled: course.communityShared,
              },
              {
                onClick: () => setConfirmDelete(true),
                icon: <Trash2 size={13} strokeWidth={1.8} style={{ color: 'var(--danger)' }} />,
                active: false,
              },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); btn.onClick() }}
                disabled={btn.disabled}
                className="flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md active:opacity-70"
                style={{
                  background:  btn.active ? 'var(--brand-soft)' : 'rgba(255,255,255,0.88)',
                  border:      btn.active ? '1px solid color-mix(in srgb, var(--brand) 30%, transparent)' : '1px solid rgba(0,0,0,0.06)',
                }}
              >
                {btn.icon}
              </button>
            ))}
          </div>

          {/* 좌상단 뱃지 묶음 */}
          <div className="absolute left-3 top-3 z-10 flex flex-col gap-1">
            {course.communityShared && (
              <div
                className="flex items-center gap-1 rounded-full px-2.5 py-1"
                style={{ background: 'var(--brand-soft)', border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)' }}
              >
                <CheckCircle size={9} strokeWidth={2} className="text-brand" />
                <span className="text-[9px] font-bold text-brand">공유됨</span>
              </div>
            )}
            {hasGpx && !isPlanned && (
              <span
                className="flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[9px] font-bold backdrop-blur-sm"
                style={{ background: 'rgba(99,102,241,0.82)', color: 'white' }}
              >
                <FileDown size={8} strokeWidth={2} />GPX
              </span>
            )}
          </div>

          {/* 사진 있을 때 제목 오버레이 */}
          {course.coverPhoto && (
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-[15px] font-bold text-white">{label}</p>
              {course.title && (
                <p className="text-[12px] font-medium text-white/75">{course.title}</p>
              )}
            </div>
          )}
        </div>

        {/* ── 하단 정보 ── */}
        <div className="px-5 pb-5 pt-4">
          {!course.coverPhoto && (
            <>
              <p className="mb-0.5 text-[16px] font-extrabold tracking-tight text-main">{label}</p>
              {course.title && (
                <p className="mb-1 text-[12px] font-medium text-sub">{course.title}</p>
              )}
            </>
          )}
          {course.diary && (
            <p className="mb-3 line-clamp-1 text-[12px] font-normal text-muted">{course.diary}</p>
          )}

          <div className="flex items-center justify-between">
            {/* 스탯 */}
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[12px] font-semibold text-sub">
                <Route size={11} strokeWidth={2} className="text-muted" />
                {fmtDist(course.distanceKm)}
              </span>
              <span className="flex items-center gap-1 text-[12px] font-semibold text-sub">
                <Clock size={11} strokeWidth={2} className="text-muted" />
                {fmtDur(course.durationMin)}
              </span>
              <span className="text-[11px] font-normal text-muted">{fmtDate(course.createdAt)}</span>
              {isPlanned && (
                <span
                  className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                  style={{ background: 'rgba(255,90,0,0.10)', color: '#FF5A00' }}
                >
                  경로계획
                </span>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex gap-1.5">
              {!isPlanned && hasGpx && (
                <button
                  onClick={e => { e.stopPropagation(); onVideoCreate?.(course) }}
                  className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-sub active:opacity-70"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                  <Clapperboard size={11} strokeWidth={1.8} />영상
                </button>
              )}
              {!isPlanned && (
                <button
                  onClick={e => { e.stopPropagation(); onDrive?.(course) }}
                  className="flex items-center gap-1 rounded-xl bg-brand px-3 py-1.5 text-[11px] font-bold text-white active:opacity-70"
                >
                  <Play size={10} strokeWidth={0} fill="white" />주행
                </button>
              )}
              {isPlanned && (
                <button
                  onClick={e => { e.stopPropagation(); onDrive?.(course) }}
                  className="flex items-center gap-1 rounded-xl bg-brand px-3 py-1.5 text-[11px] font-bold text-white active:opacity-70"
                >
                  <Navigation size={10} strokeWidth={2} />네비로 출발
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <DeleteModal
          title={label}
          onConfirm={() => { onDelete(course.id); setConfirmDelete(false) }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}
