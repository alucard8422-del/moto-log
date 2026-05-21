// EditModal.tsx — 경로 편집 (추천 코스 상세 모달과 동일한 레이아웃)
// 공유 시 CourseDetailModal에 그대로 표시되므로 동일한 구조로 작성

import { useState, useEffect, useRef } from 'react'
import { X, MapPin, Route, Clock, Image, CheckCircle, Trash2, MoreHorizontal } from 'lucide-react'
import { cityLabel, fmtDist, fmtDur } from './routeUtils'
import type { SavedCourse } from '../../../lib/courseStorage'

interface Props {
  course:  SavedCourse
  onSave:  (id: string, diary: string, photos: string[]) => void
  onClose: () => void
}

export default function EditModal({ course, onSave, onClose }: Props) {
  const [open, setOpen]             = useState(false)
  const [diary, setDiary]           = useState(course.diary ?? '')
  const [photos, setPhotos]         = useState<string[]>(course.coverPhoto ? [course.coverPhoto] : [])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [showActionSheet, setShowActionSheet] = useState(false)
  const fileRef    = useRef<HTMLInputElement>(null)
  const touchX     = useRef(0)

  const sheetWrapRef  = useRef<HTMLDivElement>(null)
  const dragHandleRef = useRef<HTMLDivElement>(null)
  const onCloseRef    = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => { const t = setTimeout(() => setOpen(true), 16); return () => clearTimeout(t) }, [])
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // 하드웨어 뒤로가기
  useEffect(() => {
    window.history.pushState({ editModalSentinel: true }, '')
    const onPop = () => onCloseRef.current()
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (window.history.state?.editModalSentinel) window.history.back()
    }
  }, [])

  // 스와이프 다운 닫기
  useEffect(() => {
    const handle = dragHandleRef.current
    const sheet  = sheetWrapRef.current
    if (!handle || !sheet) return
    let startY = 0, dragY = 0, active = false
    const CLOSE_THRESHOLD = 160
    const HINT_START      = 60
    const onStart = (e: TouchEvent) => { startY = e.touches[0].clientY; dragY = 0; active = true; sheet.style.transition = 'none' }
    const onMove  = (e: TouchEvent) => {
      if (!active) return
      dragY = Math.max(0, e.touches[0].clientY - startY)
      sheet.style.transform = `translateY(${dragY}px)`
      sheet.style.opacity   = String(dragY < HINT_START ? 1 : Math.max(0.55, 1 - (dragY - HINT_START) / (CLOSE_THRESHOLD * 1.5)))
    }
    const onEnd = () => {
      if (!active) return
      active = false
      sheet.style.opacity = ''
      if (dragY > CLOSE_THRESHOLD) {
        sheet.style.transition = 'transform 320ms ease-in, opacity 320ms ease-in'
        sheet.style.transform  = `translateY(${sheet.offsetHeight}px)`
        sheet.style.opacity    = '0'
        setTimeout(() => onCloseRef.current(), 320)
      } else {
        sheet.style.transition = 'transform 300ms cubic-bezier(0.34,1.56,0.64,1), opacity 200ms ease-out'
        sheet.style.transform  = 'translateY(0)'
        sheet.style.opacity    = '1'
        setTimeout(() => { sheet.style.transition = ''; sheet.style.transform = ''; sheet.style.opacity = '' }, 300)
      }
    }
    handle.addEventListener('touchstart', onStart, { passive: true })
    handle.addEventListener('touchmove',  onMove,  { passive: true })
    handle.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      handle.removeEventListener('touchstart', onStart)
      handle.removeEventListener('touchmove',  onMove)
      handle.removeEventListener('touchend',   onEnd)
    }
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhotos(prev => [...prev, reader.result as string])
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const deleteCurrentPhoto = () => {
    const next = photos.filter((_, i) => i !== currentIdx)
    setPhotos(next)
    setCurrentIdx(Math.max(0, Math.min(currentIdx, next.length - 1)))
    setShowActionSheet(false)
  }

  const label = cityLabel(course.gpxPoints)

  return (
    <>
      {/* 딤 */}
      <div
        className={`fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* 시트 */}
      <div
        ref={sheetWrapRef}
        className={`fixed inset-x-0 bottom-0 z-[80] transition-transform duration-500 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div
          className="mx-auto max-w-sm overflow-hidden rounded-t-3xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/60"
          style={{ maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }}
        >

          {/* ── 상단 이미지 영역 (CourseDetailModal과 동일 구조) ── */}
          <div
            className="relative h-44 w-full shrink-0 overflow-hidden"
            onTouchStart={e => { touchX.current = e.touches[0].clientX }}
            onTouchEnd={e => {
              const dx = e.changedTouches[0].clientX - touchX.current
              if (Math.abs(dx) < 40) return
              if (dx < 0 && currentIdx < photos.length - 1) setCurrentIdx(i => i + 1)
              if (dx > 0 && currentIdx > 0) setCurrentIdx(i => i - 1)
            }}
          >
            {photos.length > 0 ? (
              <>
                <div
                  className="flex h-full transition-transform duration-300 ease-out"
                  style={{ width: `${photos.length * 100}%`, transform: `translateX(-${(currentIdx * 100) / photos.length}%)` }}
                >
                  {photos.map((url, i) => (
                    <div key={i} style={{ width: `${100 / photos.length}%` }} className="h-full shrink-0">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
                {/* 사진 옵션 버튼 */}
                <button
                  onClick={() => setShowActionSheet(true)}
                  className="absolute right-12 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-950/60 text-white/50 backdrop-blur-sm active:opacity-60"
                >
                  <MoreHorizontal size={14} strokeWidth={2} />
                </button>
                {photos.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                    {photos.map((_, i) => (
                      <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-800/80 text-white/30 active:opacity-60"
              >
                <Image size={28} strokeWidth={1.2} />
                <span className="text-xs font-light">대표 사진 추가</span>
              </button>
            )}

            {/* 그라디언트 오버레이 */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent pointer-events-none" />

            {/* 드래그 핸들 + 닫기 버튼 */}
            <div ref={dragHandleRef} className="absolute inset-x-0 top-0 flex h-10 items-start justify-between px-4 pt-2">
              <div className="mx-auto mt-1 h-1 w-10 rounded-full bg-white/20" />
            </div>
            <button
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-950/60 text-white/50 backdrop-blur-sm active:opacity-60"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>

          {/* ── 스크롤 가능 본문 ── */}
          <div className="flex flex-col gap-5 overflow-y-auto px-5 pb-8 pt-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

            {/* 제목 + 통계 (CourseDetailModal 헤더와 동일) */}
            <div>
              <h2 className="text-xl font-bold leading-tight text-white">{label}</h2>
              {course.title && <p className="mt-0.5 text-sm font-light text-white/50">{course.title}</p>}
              <div className="mt-2 flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs font-light text-white/40">
                  <MapPin size={11} strokeWidth={1.5} />
                  {label}
                </span>
                <span className="flex items-center gap-1 text-xs font-light text-white/40">
                  <Route size={11} strokeWidth={1.5} />
                  {fmtDist(course.distanceKm)}
                </span>
                <span className="flex items-center gap-1 text-xs font-light text-white/40">
                  <Clock size={11} strokeWidth={1.5} />
                  {fmtDur(course.durationMin)}
                </span>
              </div>
            </div>

            {/* 구분선 */}
            <div className="h-px bg-white/5" />

            {/* 설명 입력 (공유 시 추천코스 설명으로 표시) */}
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-light text-white/35">
                설명 · 공유 시 추천 코스에 그대로 표시됩니다
              </p>
              <textarea
                value={diary}
                onChange={e => setDiary(e.target.value)}
                placeholder="이 경로에 대한 소개나 후기를 남겨보세요 🏍️"
                rows={4}
                maxLength={300}
                className="w-full resize-none rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm font-light text-white outline-none placeholder:text-white/20 focus:border-[#FF5A00]/30 transition-colors leading-relaxed"
              />
              <p className="text-right text-[10px] font-light text-white/20">{diary.length}/300</p>
            </div>

            {/* 저장 버튼 */}
            <button
              onClick={() => onSave(course.id, diary, photos)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A00] py-4 text-sm font-bold text-white active:opacity-80"
            >
              <CheckCircle size={15} strokeWidth={2} />
              저장하기
            </button>
          </div>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif" className="hidden" onChange={handleFile} />

      {/* 액션 시트 (사진 메뉴) */}
      {showActionSheet && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/50" onClick={() => setShowActionSheet(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[100]">
            <div className="mx-auto max-w-sm rounded-t-3xl border border-white/10 bg-[#161B26]/98 px-4 pt-4 pb-10 backdrop-blur-xl">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
              <button
                onClick={() => { setShowActionSheet(false); fileRef.current?.click() }}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-light text-white/70 active:bg-white/5"
              >
                <Image size={16} strokeWidth={1.5} className="text-[#FF5A00]" />
                사진 추가하기
              </button>
              <button
                onClick={deleteCurrentPhoto}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-light text-rose-400 active:bg-white/5"
              >
                <Trash2 size={16} strokeWidth={1.5} />
                현재 사진 삭제하기
              </button>
              <div className="my-2 h-px bg-white/5" />
              <button
                onClick={() => setShowActionSheet(false)}
                className="flex w-full items-center justify-center rounded-2xl px-4 py-3.5 text-sm font-light text-white/30 active:bg-white/5"
              >
                취소
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
