// CourseSharePage.tsx — 한 줄 일기 팝업 + 사진 한 장 첨부
import { useState, useEffect, useRef } from 'react'
import {
  Route, Clock, MapPin, Flag, Send, X, Image, CheckCircle,
} from 'lucide-react'
import { loadCourses, shareCourse, type SavedCourse } from '../lib/courseStorage'

function fmtDist(km: number): string {
  return km < 1 ? `${(km * 1000).toFixed(0)}m` : `${km.toFixed(2)}km`
}
function fmtDur(m: number): string {
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

// ── 빈 상태 ────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 px-8 pt-28 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
        <Flag size={32} strokeWidth={1.5} className="text-white/15" />
      </div>
      <div>
        <p className="text-sm font-bold text-white/40">아직 기록된 코스가 없어요</p>
        <p className="mt-1 text-xs font-light text-white/20">
          지도 탭에서 주행을 시작하면<br />이 곳에 코스가 쌓여요.
        </p>
      </div>
    </div>
  )
}

// ── 코스 행 ────────────────────────────────────────────────────────────────
interface CourseRowProps {
  course: SavedCourse
  onWrite: (course: SavedCourse) => void
}

function CourseRow({ course, onWrite }: CourseRowProps) {
  return (
    <div className="rounded-3xl border border-white/5 bg-white/5 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-bold leading-snug text-white">{course.title}</p>
          <p className="mt-0.5 text-[10px] font-light text-white/30">{fmtDate(course.createdAt)}</p>
        </div>
        {course.isShared && (
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-teal-400/10 px-2.5 py-1">
            <CheckCircle size={10} strokeWidth={1.5} className="text-teal-400" />
            <span className="text-[9px] font-bold text-teal-400">공유됨</span>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-[11px] font-light text-white/40">
        <span className="flex items-center gap-1"><Route size={11} strokeWidth={1.5} />{fmtDist(course.distanceKm)}</span>
        <span className="flex items-center gap-1"><Clock size={11} strokeWidth={1.5} />{fmtDur(course.durationMin)}</span>
        <span className="flex items-center gap-1"><MapPin size={11} strokeWidth={1.5} />{course.gpxPoints.length}개 포인트</span>
      </div>

      {!course.isShared ? (
        <button
          onClick={() => onWrite(course)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-400/10 py-3 text-sm font-bold text-teal-400 ring-1 ring-teal-400/20 transition-opacity active:opacity-70"
        >
          <Send size={14} strokeWidth={1.5} />
          투어 후기 공유하기
        </button>
      ) : (
        <div className="flex w-full items-center justify-center rounded-2xl bg-white/5 py-3 text-xs font-light text-white/25">
          커뮤니티 추천 코스에 등록되었습니다
        </div>
      )}
    </div>
  )
}

// ── 한 줄 일기 팝업 (바텀시트) ─────────────────────────────────────────────
interface DiarySheetProps {
  course: SavedCourse
  onClose: () => void
  onPublish: (courseId: string, diary: string, photo: string | null) => void
}

function DiarySheet({ course, onClose, onPublish }: DiarySheetProps) {
  const [diary, setDiary]   = useState('')
  const [photo, setPhoto]   = useState<string | null>(null)
  const [open, setOpen]     = useState(false)
  const fileRef             = useRef<HTMLInputElement>(null)

  // 슬라이드업 애니메이션
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 16)
    return () => clearTimeout(t)
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhoto(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handlePublish = () => {
    if (!diary.trim()) return
    onPublish(course.id, diary, photo)
  }

  return (
    <>
      {/* 백드롭 */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* 시트 본체 */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="mx-auto max-w-sm rounded-t-3xl bg-[#161B26]/98 px-5 pt-5 pb-10 backdrop-blur-xl">
          {/* 핸들 */}
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />

          {/* 코스명 + 닫기 */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-light text-white/30">투어 후기 남기기</p>
              <p className="text-sm font-bold text-white">{course.title}</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40 active:opacity-60"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>

          {/* 사진 첨부 프리뷰 */}
          {photo ? (
            <div className="relative mb-3 overflow-hidden rounded-2xl">
              <img src={photo} alt="첨부 사진" className="h-36 w-full object-cover" />
              <button
                onClick={() => setPhoto(null)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/70 text-white/60 active:opacity-60"
              >
                <X size={12} strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] py-3.5 text-xs font-light text-white/30 transition-colors hover:border-white/20 active:opacity-60"
            >
              <Image size={13} strokeWidth={1.5} />
              사진 한 장 첨부
            </button>
          )}

          {/* 다이어리 텍스트 */}
          <textarea
            value={diary}
            onChange={(e) => setDiary(e.target.value)}
            placeholder="오늘 여기 다녀왔는데… 한 줄 후기를 남겨보세요 🏍️"
            rows={3}
            maxLength={140}
            className="mb-1 w-full resize-none rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-3 text-sm font-light leading-relaxed text-white outline-none placeholder:text-white/20 focus:border-teal-400/30 transition-colors"
          />
          <p className="mb-4 text-right text-[10px] font-light text-white/20">{diary.length}/140</p>

          {/* 공유 버튼 */}
          <button
            onClick={handlePublish}
            disabled={!diary.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-3xl bg-teal-400 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-teal-400/20 transition-opacity active:opacity-80 disabled:opacity-30"
          >
            <Send size={14} strokeWidth={2} />
            커뮤니티에 공유하기
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.heic,.heif" className="hidden" onChange={handleFile} />
    </>
  )
}

// ── 완료 토스트 ────────────────────────────────────────────────────────────
function PublishToast({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed inset-x-0 bottom-36 z-[60] flex justify-center pointer-events-none">
      <div className="flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-5 py-3 backdrop-blur-md">
        <Send size={13} strokeWidth={1.5} className="text-teal-400" />
        <span className="text-xs font-bold text-teal-400">커뮤니티에 공유되었습니다</span>
      </div>
    </div>
  )
}

// ── 메인 ───────────────────────────────────────────────────────────────────
export default function CourseSharePage() {
  const [courses, setCourses]         = useState<SavedCourse[]>([])
  const [editingCourse, setEditing]   = useState<SavedCourse | null>(null)
  const [showToast, setShowToast]     = useState(false)

  useEffect(() => {
    setCourses(loadCourses())
  }, [])

  const handlePublish = (courseId: string, _diary: string, _photo: string | null) => {
    shareCourse(courseId)
    setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...c, isShared: true } : c)))
    setEditing(null)
    setShowToast(true)
  }

  return (
    <>
      <div className="flex flex-col gap-5 p-4">
        <div>
          <p className="text-xs font-light text-white/40">
            {courses.length > 0 ? `내 주행 기록 ${courses.length}개` : '내 주행 기록'}
          </p>
          <h2 className="text-xl font-bold text-white">코스 공유</h2>
        </div>

        {courses.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            {courses.map((c) => (
              <CourseRow key={c.id} course={c} onWrite={setEditing} />
            ))}
          </div>
        )}
      </div>

      {editingCourse && (
        <DiarySheet
          course={editingCourse}
          onClose={() => setEditing(null)}
          onPublish={handlePublish}
        />
      )}

      {showToast && <PublishToast onDone={() => setShowToast(false)} />}
    </>
  )
}
