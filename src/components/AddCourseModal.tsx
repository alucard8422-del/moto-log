import { useState, useRef, useEffect } from 'react'
import { X, Tag, Plus } from 'lucide-react'
import type { TourCardData } from './TourCard'

type Mood = TourCardData['mood']

const MOODS: Mood[] = ['여유로운', '감성적인', '도전적인']

interface AddCourseModalProps {
  onClose: () => void
  onAdd: (course: TourCardData) => void
}

export default function AddCourseModal({ onClose, onAdd }: AddCourseModalProps) {
  const [title, setTitle] = useState('')
  const [region, setRegion] = useState('')
  const [description, setDescription] = useState('')
  const [distance, setDistance] = useState('')
  const [mood, setMood] = useState<Mood>('여유로운')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  const addTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '')
    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      setTags((prev) => [...prev, trimmed])
    }
    setTagInput('')
  }

  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t))

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
  }

  const canSubmit = title.trim().length > 0 && region.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    const newCourse: TourCardData = {
      id: `user-${Date.now()}`,
      title: title.trim(),
      region: region.trim(),
      description: description.trim(),
      mood,
      distanceKm: Number(distance) || 0,
      tags,
    }
    console.log('[AddCourseModal] 코스 등록:', newCourse)
    onAdd(newCourse)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />

      {/* 모달 패널 — 모바일은 바텀시트, 데스크톱은 센터 */}
      <div
        className="relative w-full max-w-sm rounded-t-3xl border border-white/10 bg-slate-900/90 p-6 pb-10 shadow-2xl shadow-black/60 backdrop-blur-xl sm:rounded-3xl sm:pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">새 코스 등록</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white/70"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* 제목 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-light uppercase tracking-widest text-white/30">
              코스 이름 *
            </label>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 북한산 카페 투어"
              maxLength={40}
              className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-light text-white placeholder-white/20 outline-none focus:border-teal-400/40 focus:bg-white/8"
            />
          </div>

          {/* 지역 + 거리 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-light uppercase tracking-widest text-white/30">
                지역 *
              </label>
              <input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="예) 강원 평창"
                className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-light text-white placeholder-white/20 outline-none focus:border-teal-400/40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-light uppercase tracking-widest text-white/30">
                거리 (km)
              </label>
              <input
                value={distance}
                onChange={(e) => setDistance(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                inputMode="numeric"
                className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-light text-white placeholder-white/20 outline-none focus:border-teal-400/40"
              />
            </div>
          </div>

          {/* 분위기 선택 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-light uppercase tracking-widest text-white/30">
              분위기
            </label>
            <div className="flex gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  className={`flex-1 rounded-2xl py-2.5 text-xs transition-all duration-200 ${
                    mood === m
                      ? 'bg-teal-400/15 font-bold text-teal-400'
                      : 'bg-white/5 font-light text-white/40 hover:text-white/60'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* 설명 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-light uppercase tracking-widest text-white/30">
              간단한 설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 코스만의 매력을 한 줄로 적어주세요"
              rows={2}
              maxLength={120}
              className="resize-none rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-light text-white placeholder-white/20 outline-none focus:border-teal-400/40"
            />
          </div>

          {/* 태그 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-light uppercase tracking-widest text-white/30">
              태그 (최대 5개)
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-white/5 px-3 py-2">
              <Tag size={13} strokeWidth={1.5} className="shrink-0 text-white/25" />
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="태그 입력 후 Enter"
                disabled={tags.length >= 5}
                className="flex-1 bg-transparent text-sm font-light text-white placeholder-white/20 outline-none disabled:opacity-30"
              />
              <button
                onClick={addTag}
                disabled={!tagInput.trim() || tags.length >= 5}
                className="text-white/30 hover:text-teal-400 disabled:opacity-20"
              >
                <Plus size={14} strokeWidth={1.5} />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 rounded-full bg-teal-400/10 px-3 py-1 text-[11px] font-light text-teal-400"
                  >
                    #{t}
                    <button onClick={() => removeTag(t)} className="opacity-60 hover:opacity-100">
                      <X size={10} strokeWidth={2} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 등록 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="mt-6 w-full rounded-2xl bg-teal-400 py-4 text-sm font-bold text-slate-950 transition-opacity disabled:opacity-30 active:opacity-80"
        >
          코스 등록
        </button>
      </div>
    </div>
  )
}
