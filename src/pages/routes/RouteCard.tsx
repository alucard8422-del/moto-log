// RouteCard.tsx — 내 경로 > 주행 기록 카드
import { useState } from 'react'
import { Route, Clock, MapPin, Pencil, Share2, CheckCircle, Trash2, Clapperboard, FileDown, Play } from 'lucide-react'
import { cityLabel, fmtDist, fmtDur, fmtDate } from './routeUtils'
import DeleteModal from './DeleteModal'
import type { SavedCourse } from '../../lib/courseStorage'

const ORANGE = '#F97316'

interface Props {
  course:          SavedCourse
  onDelete:        (id: string) => void
  onEdit:          (course: SavedCourse) => void
  onShare:         (course: SavedCourse) => void
  onVideoCreate?:  (course: SavedCourse) => void
  onDrive?:        (course: SavedCourse) => void
}

export default function RouteCard({ course, onDelete, onEdit, onShare, onVideoCreate, onDrive }: Props) {
  const label    = cityLabel(course.gpxPoints)
  const hasGpx   = !!course.gpxXml && course.gpxXml.length > 50
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onEdit(course)}
        className="w-full overflow-hidden cursor-pointer active:opacity-90 transition-opacity"
        style={{
          borderRadius: 24,
          backgroundColor: '#FFFFFF',
          boxShadow: '0 2px 20px rgba(0,0,0,0.07)',
        }}
      >
        {/* ── 커버 이미지 영역 ── */}
        <div className="relative h-44 w-full overflow-hidden">
          {course.coverPhoto
            ? <img src={course.coverPhoto} className="h-full w-full object-cover" alt="" />
            : (
              /* 사진 없을 때 — 따뜻한 그라디언트 플레이스홀더 */
              <div
                className="h-full w-full"
                style={{
                  background: 'linear-gradient(135deg, #FED7AA 0%, #FEF3C7 50%, #FFFBEB 100%)',
                }}
              >
                <div className="flex h-full items-center justify-center">
                  <MapPin size={32} strokeWidth={1} style={{ color: '#FDBA74', opacity: 0.6 }} />
                </div>
              </div>
            )
          }

          {/* 그라디언트 오버레이 — 사진 있을 때만 */}
          {course.coverPhoto && (
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)' }} />
          )}

          {/* ── 우상단 액션 버튼 ── */}
          <div className="absolute right-3 top-3 z-10 flex gap-1.5">
            <button
              onClick={e => { e.stopPropagation(); onEdit(course) }}
              className="flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md active:opacity-70"
              style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)' }}
            >
              <Pencil size={13} strokeWidth={1.8} style={{ color: '#78716C' }} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); if (!course.communityShared) onShare(course) }}
              disabled={!!course.communityShared}
              className="flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md active:opacity-70"
              style={{
                background: course.communityShared ? '#FFF3E8' : 'rgba(255,255,255,0.85)',
                border: course.communityShared ? `1px solid ${ORANGE}40` : '1px solid rgba(0,0,0,0.06)',
              }}
            >
              {course.communityShared
                ? <CheckCircle size={13} strokeWidth={2} style={{ color: ORANGE }} />
                : <Share2 size={13} strokeWidth={1.8} style={{ color: '#78716C' }} />
              }
            </button>
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
              className="flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md active:opacity-70"
              style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)' }}
            >
              <Trash2 size={13} strokeWidth={1.8} style={{ color: '#F87171' }} />
            </button>
          </div>

          {/* 공유 뱃지 */}
          {course.communityShared && (
            <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full px-2.5 py-1"
              style={{ background: '#FFF3E8', border: `1px solid ${ORANGE}40` }}>
              <CheckCircle size={9} strokeWidth={2} style={{ color: ORANGE }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: ORANGE }}>공유됨</span>
            </div>
          )}

          {/* 사진 있을 때 하단 제목 오버레이 */}
          {course.coverPhoto && (
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{label}</p>
            </div>
          )}
        </div>

        {/* ── 하단 정보 영역 ── */}
        <div className="px-4 pb-4 pt-3">

          {/* 사진 없을 때 제목 */}
          {!course.coverPhoto && (
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1C0A00', marginBottom: 6 }}>
              {label}
            </p>
          )}

          {/* 다이어리 */}
          {course.diary && (
            <p className="line-clamp-1 mb-2" style={{ fontSize: 12, color: '#A8A29E' }}>
              {course.diary}
            </p>
          )}

          {/* ── 스탯 + 버튼 행 ── */}
          <div className="flex items-center justify-between">
            {/* 스탯 */}
            <div className="flex gap-3">
              <span className="flex items-center gap-1" style={{ fontSize: 12, color: '#78716C' }}>
                <Route size={11} strokeWidth={1.8} style={{ color: '#A8A29E' }} />
                {fmtDist(course.distanceKm)}
              </span>
              <span className="flex items-center gap-1" style={{ fontSize: 12, color: '#78716C' }}>
                <Clock size={11} strokeWidth={1.8} style={{ color: '#A8A29E' }} />
                {fmtDur(course.durationMin)}
              </span>
              <span style={{ fontSize: 12, color: '#C4B8B0' }}>{fmtDate(course.createdAt)}</span>
              {hasGpx && (
                <span className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5"
                  style={{ background: '#F3F0FF', fontSize: 9, fontWeight: 700, color: '#7C3AED' }}>
                  <FileDown size={8} strokeWidth={2} />GPX
                </span>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex gap-1.5">
              {hasGpx && (
                <button
                  onClick={e => { e.stopPropagation(); onVideoCreate?.(course) }}
                  className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 active:opacity-70"
                  style={{ background: '#F5F0EB', fontSize: 11, fontWeight: 600, color: '#78716C' }}
                >
                  <Clapperboard size={11} strokeWidth={1.8} />영상
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); onDrive?.(course) }}
                className="flex items-center gap-1 rounded-xl px-3 py-1.5 active:opacity-70"
                style={{ background: ORANGE, fontSize: 11, fontWeight: 700, color: 'white' }}
              >
                <Play size={10} strokeWidth={0} fill="white" />주행
              </button>
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
