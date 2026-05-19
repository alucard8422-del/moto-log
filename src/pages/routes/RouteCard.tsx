// RouteCard.tsx — 내 경로 > 주행 기록 카드
// GPX 있으면: 도시 레이블 옆 GPX 뱃지 + 우하단 '영상 만들기' 버튼 표시

import { useState } from 'react'
import { Route, Clock, Navigation, Pencil, Share2, CheckCircle, Trash2, Clapperboard, FileDown, Play } from 'lucide-react'
import { cityLabel, fmtDist, fmtDur, fmtDate } from './routeUtils'
import DeleteModal from './DeleteModal'
import type { SavedCourse } from '../../lib/courseStorage'

interface Props {
  course:          SavedCourse
  onDelete:        (id: string) => void
  onEdit:          (course: SavedCourse) => void
  onShare:         (course: SavedCourse) => void
  onVideoCreate?:  (course: SavedCourse) => void
  onDrive?:        (course: SavedCourse) => void
}

export default function RouteCard({ course, onDelete, onEdit, onShare, onVideoCreate, onDrive }: Props) {
  const label      = cityLabel(course.gpxPoints)
  const hasGpx     = !!course.gpxXml && course.gpxXml.length > 50
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onEdit(course)}
        className="relative h-48 w-full overflow-hidden rounded-3xl border border-white/5 cursor-pointer active:opacity-90 transition-opacity"
      >
        {/* 배경 사진 */}
        {course.coverPhoto
          ? <img src={course.coverPhoto} className="absolute inset-0 h-full w-full object-cover" alt="" />
          : <div
              className="absolute inset-0 bg-[#0b1120]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)`,
                backgroundSize: '20px 20px',
              }}
            />
        }

        {/* 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* 우상단 버튼 */}
        <div className="absolute right-3 top-3 z-10 flex gap-1.5">
          <button
            onClick={e => { e.stopPropagation(); onEdit(course) }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/50 backdrop-blur-md active:bg-teal-400/20 active:text-teal-400"
          >
            <Pencil size={12} strokeWidth={1.5} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); if (!course.communityShared) onShare(course) }}
            disabled={!!course.communityShared}
            className={`flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition-colors duration-300 ${
              course.communityShared
                ? 'border-teal-400/30 bg-teal-400/10 text-teal-400'
                : 'border-white/10 bg-black/40 text-white/50 active:bg-teal-400/20 active:text-teal-400'
            }`}
          >
            {course.communityShared
              ? <CheckCircle size={12} strokeWidth={2} />
              : <Share2      size={12} strokeWidth={1.5} />
            }
          </button>
          <button
            onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/50 backdrop-blur-md active:bg-rose-500/20 active:text-rose-400"
          >
            <Trash2 size={12} strokeWidth={1.5} />
          </button>
        </div>

        {/* 공유됨 뱃지 */}
        {course.communityShared && (
          <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-teal-400/15 px-2.5 py-1 border border-teal-400/20">
            <CheckCircle size={9} strokeWidth={1.5} className="text-teal-400" />
            <span className="text-[9px] font-bold text-teal-400">커뮤니티 공유됨</span>
          </div>
        )}

        {/* 하단 정보 */}
        <div className="absolute inset-x-0 bottom-0 p-4">

          {/* 도시 레이블 + GPX 뱃지 */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="flex items-center gap-1.5 text-base font-bold text-white drop-shadow-md">
              <Navigation size={13} strokeWidth={1.5} className="shrink-0 text-teal-400" />
              {label}
            </p>
            {/* ③ GPX 뱃지 */}
            {hasGpx && (
              <div className="flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-500/15 px-2 py-0.5 backdrop-blur-sm">
                <FileDown size={9} strokeWidth={2} className="text-violet-400" />
                <span className="text-[9px] font-bold tracking-wide text-violet-300">GPX</span>
              </div>
            )}
          </div>

          {course.diary && (
            <p className="mt-0.5 line-clamp-1 text-[11px] font-light text-white/55">
              {course.diary}
            </p>
          )}

          {/* 스탯 */}
          <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] font-light text-white/50">
            <span className="flex items-center gap-1">
              <Route size={10} strokeWidth={1.5} />{fmtDist(course.distanceKm)}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={10} strokeWidth={1.5} />{fmtDur(course.durationMin)}
            </span>
            <span className="text-white/30">{fmtDate(course.createdAt)}</span>
          </div>

          {/* 버튼 행 */}
          <div className="mt-2 flex items-center justify-end gap-1.5">
            {/* 영상 만들기 (GPX 있을 때만) */}
            {hasGpx && (
              <button
                onClick={e => { e.stopPropagation(); onVideoCreate?.(course) }}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-sm active:opacity-70 transition-opacity"
              >
                <Clapperboard size={11} strokeWidth={2} className="text-white/50" />
                <span className="text-[10px] font-bold text-white/50">영상</span>
              </button>
            )}
            {/* 주행하기 */}
            <button
              onClick={e => { e.stopPropagation(); onDrive?.(course) }}
              className="flex items-center gap-1.5 rounded-xl border border-teal-400/30 bg-teal-400/15 px-3 py-1.5 backdrop-blur-sm active:opacity-70 transition-opacity"
            >
              <Play size={10} strokeWidth={2.5} className="text-teal-400 fill-teal-400" />
              <span className="text-[10px] font-bold text-teal-400">주행하기</span>
            </button>
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
