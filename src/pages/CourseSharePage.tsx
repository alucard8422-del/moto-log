// CourseSharePage.tsx — 내 주행 기록 & 블록형 블로그 글쓰기 편집기
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Route, Clock, MapPin, Flag, Plus, Image, Type,
  ChevronUp, ChevronDown, Trash2, Send, ArrowLeft,
} from 'lucide-react'
import { loadCourses, shareCourse, type SavedCourse } from '../lib/courseStorage'

// ── 포맷 헬퍼 ─────────────────────────────────────────────────────────────
function fmtDist(km: number): string {
  return km < 1 ? `${(km * 1000).toFixed(0)}m` : `${km.toFixed(2)}km`
}
function fmtDur(m: number): string {
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

// ── 블록 타입 ──────────────────────────────────────────────────────────────
interface TextBlock {
  id: string
  type: 'text'
  value: string
}
interface ImageBlock {
  id: string
  type: 'image'
  src: string      // base64 또는 objectURL
  caption: string
}
type Block = TextBlock | ImageBlock

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

// ── 빈 상태 컴포넌트 ───────────────────────────────────────────────────────
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

// ── 개별 코스 행 ───────────────────────────────────────────────────────────
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
            <span className="text-[9px] font-bold text-teal-400">공유됨</span>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-[11px] font-light text-white/40">
        <span className="flex items-center gap-1"><Route size={11} strokeWidth={1.5} />{fmtDist(course.distanceKm)}</span>
        <span className="flex items-center gap-1"><Clock size={11} strokeWidth={1.5} />{fmtDur(course.durationMin)}</span>
        <span className="flex items-center gap-1"><MapPin size={11} strokeWidth={1.5} />{course.gpxPoints.length}개 포인트</span>
      </div>

      <button
        onClick={() => onWrite(course)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-400/10 py-3 text-sm font-bold text-teal-400 ring-1 ring-teal-400/20 transition-opacity active:opacity-70"
      >
        <Type size={14} strokeWidth={1.5} />
        투어 후기 작성하기
      </button>
    </div>
  )
}

// ── 블록 에디터 (풀스크린 모달) ────────────────────────────────────────────
interface BlogEditorProps {
  course: SavedCourse
  onClose: () => void
  onPublish: (courseId: string, blocks: Block[]) => void
}

function BlogEditor({ course, onClose, onPublish }: BlogEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>([
    { id: uid(), type: 'text', value: '' },
  ])
  const [title, setTitle] = useState(`${course.title} 후기`)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // 이미지 삽입 기준 인덱스 (어떤 블록 뒤에 넣을지)
  const insertAfterRef = useRef<number>(-1)

  // 텍스트 블록 값 변경
  const updateText = useCallback((id: string, value: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, value } as TextBlock : b)))
  }, [])

  // 캡션 변경
  const updateCaption = useCallback((id: string, caption: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, caption } as ImageBlock : b)))
  }, [])

  // 블록 삭제
  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      const next = prev.filter((b) => b.id !== id)
      // 최소 1개의 텍스트 블록 유지
      return next.length === 0 ? [{ id: uid(), type: 'text', value: '' }] : next
    })
  }, [])

  // 블록 순서 이동
  const moveBlock = useCallback((id: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id)
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }, [])

  // 특정 인덱스 뒤에 텍스트 블록 추가
  const addTextAfter = useCallback((afterIdx: number) => {
    const newBlock: TextBlock = { id: uid(), type: 'text', value: '' }
    setBlocks((prev) => {
      const next = [...prev]
      next.splice(afterIdx + 1, 0, newBlock)
      return next
    })
  }, [])

  // 이미지 선택 트리거 (afterIdx: 이 블록 다음에 삽입)
  const triggerImagePicker = useCallback((afterIdx: number) => {
    insertAfterRef.current = afterIdx
    fileInputRef.current?.click()
  }, [])

  // 파일 선택 처리
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const src = reader.result as string
      const newBlock: ImageBlock = { id: uid(), type: 'image', src, caption: '' }
      setBlocks((prev) => {
        const next = [...prev]
        const insertAt = insertAfterRef.current + 1
        next.splice(insertAt, 0, newBlock)
        return next
      })
    }
    reader.readAsDataURL(file)
    // 같은 파일 재선택 허용
    e.target.value = ''
  }

  const handlePublish = () => {
    onPublish(course.id, blocks)
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#0B0F19]">

      {/* ── 상단 앱바 ── */}
      <div className="flex items-center justify-between border-b border-white/5 bg-[#0B0F19]/95 px-4 py-3 backdrop-blur-md">
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 active:opacity-60"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>

        <div className="flex-1 px-3">
          <p className="text-[10px] font-light text-white/30">{course.title}</p>
          <p className="text-xs font-bold text-white">투어 후기 작성</p>
        </div>

        <button
          onClick={handlePublish}
          className="flex items-center gap-1.5 rounded-2xl bg-teal-400 px-4 py-2 text-xs font-bold text-slate-950 transition-opacity active:opacity-80"
        >
          <Send size={12} strokeWidth={2} />
          공유하기
        </button>
      </div>

      {/* ── 스크롤 편집 영역 ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-40 pt-5">

        {/* 제목 입력 */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력해주세요"
          className="mb-6 w-full bg-transparent text-2xl font-bold text-white outline-none placeholder:text-white/20"
        />

        {/* 코스 메타 칩 */}
        <div className="mb-6 flex flex-wrap gap-2 text-[11px] font-light text-white/30">
          <span className="flex items-center gap-1 rounded-full border border-white/5 bg-white/5 px-3 py-1">
            <Route size={10} strokeWidth={1.5} />{fmtDist(course.distanceKm)}
          </span>
          <span className="flex items-center gap-1 rounded-full border border-white/5 bg-white/5 px-3 py-1">
            <Clock size={10} strokeWidth={1.5} />{fmtDur(course.durationMin)}
          </span>
          <span className="rounded-full border border-white/5 bg-white/5 px-3 py-1">
            {fmtDate(course.createdAt)}
          </span>
        </div>

        {/* ── 블록 목록 ── */}
        {blocks.map((block, idx) => (
          <div key={block.id} className="group relative mb-3">

            {/* 블록 본체 */}
            {block.type === 'text' ? (
              <textarea
                value={block.value}
                onChange={(e) => updateText(block.id, e.target.value)}
                placeholder="내용을 입력하세요..."
                rows={4}
                className="w-full resize-none rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3.5 text-sm font-light leading-relaxed text-white outline-none placeholder:text-white/20 focus:border-teal-400/30 focus:bg-white/[0.05] transition-colors"
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03]">
                <img
                  src={block.src}
                  alt="첨부 이미지"
                  className="w-full object-cover"
                  style={{ maxHeight: '320px' }}
                />
                <input
                  type="text"
                  value={block.caption}
                  onChange={(e) => updateCaption(block.id, e.target.value)}
                  placeholder="사진 설명 (선택)"
                  className="w-full bg-transparent px-4 py-2.5 text-[11px] font-light text-white/40 outline-none placeholder:text-white/20"
                />
              </div>
            )}

            {/* 블록 컨트롤 (우측 상단 float) */}
            <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
              <button
                onClick={() => moveBlock(block.id, -1)}
                disabled={idx === 0}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800/90 text-white/40 disabled:opacity-20 active:opacity-60"
              >
                <ChevronUp size={12} strokeWidth={2} />
              </button>
              <button
                onClick={() => moveBlock(block.id, 1)}
                disabled={idx === blocks.length - 1}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800/90 text-white/40 disabled:opacity-20 active:opacity-60"
              >
                <ChevronDown size={12} strokeWidth={2} />
              </button>
              <button
                onClick={() => removeBlock(block.id)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 active:opacity-60"
              >
                <Trash2 size={11} strokeWidth={1.5} />
              </button>
            </div>

            {/* ── 블록 사이 삽입 버튼 바 ── */}
            <div className="mt-2 flex items-center gap-2">
              <div className="h-px flex-1 bg-white/[0.04]" />
              <button
                onClick={() => addTextAfter(idx)}
                className="flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[10px] font-light text-white/30 transition-colors hover:border-teal-400/20 hover:text-teal-400 active:opacity-60"
              >
                <Plus size={9} strokeWidth={2} />
                텍스트
              </button>
              <button
                onClick={() => triggerImagePicker(idx)}
                className="flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[10px] font-light text-white/30 transition-colors hover:border-violet-400/20 hover:text-violet-400 active:opacity-60"
              >
                <Image size={9} strokeWidth={1.5} />
                사진
              </button>
              <div className="h-px flex-1 bg-white/[0.04]" />
            </div>
          </div>
        ))}
      </div>

      {/* 숨겨진 파일 인풋 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

// ── 완료 토스트 ────────────────────────────────────────────────────────────
function PublishToast({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed inset-x-0 bottom-36 z-[90] flex justify-center px-6 pointer-events-none">
      <div className="flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-5 py-3 backdrop-blur-md">
        <Send size={13} strokeWidth={1.5} className="text-teal-400" />
        <span className="text-xs font-bold text-teal-400">커뮤니티에 공유되었습니다</span>
      </div>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────
export default function CourseSharePage() {
  const [courses, setCourses] = useState<SavedCourse[]>([])
  const [editingCourse, setEditingCourse] = useState<SavedCourse | null>(null)
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    setCourses(loadCourses())
  }, [])

  const handleWrite = (course: SavedCourse) => {
    setEditingCourse(course)
  }

  const handlePublish = (courseId: string, _blocks: Block[]) => {
    // 실제 서버 전송 자리 — 현재는 isShared 마킹만
    shareCourse(courseId)
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, isShared: true } : c))
    )
    setEditingCourse(null)
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
              <CourseRow key={c.id} course={c} onWrite={handleWrite} />
            ))}
          </div>
        )}
      </div>

      {/* 풀스크린 블로그 에디터 */}
      {editingCourse && (
        <BlogEditor
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onPublish={handlePublish}
        />
      )}

      {/* 공유 완료 토스트 */}
      {showToast && <PublishToast onDone={() => setShowToast(false)} />}
    </>
  )
}
