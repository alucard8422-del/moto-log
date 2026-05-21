// EditModal.tsx — 경로 사후 편집 모달 (사진 슬라이더 + 후기 작성)
// 편집 UI 수정 시 이 파일만 건드리면 됩니다.

import { useState, useEffect, useRef } from 'react'
import { Image, X, CheckCircle, Trash2, MoreHorizontal } from 'lucide-react'
import { cityLabel } from './routeUtils'
import type { SavedCourse } from '../../../lib/courseStorage'

interface Props {
  course:  SavedCourse
  onSave:  (id: string, diary: string, photos: string[]) => void
  onClose: () => void
}

export default function EditModal({ course, onSave, onClose }: Props) {
  const [open, setOpen]               = useState(false)
  const [diary, setDiary]             = useState(course.diary ?? '')
  const [photos, setPhotos]           = useState<string[]>(course.coverPhoto ? [course.coverPhoto] : [])
  const [currentIdx, setCurrentIdx]   = useState(0)
  const [showActionSheet, setShowActionSheet] = useState(false)
  const fileRef    = useRef<HTMLInputElement>(null)
  const touchX     = useRef(0)

  // DOM refs
  const sheetWrapRef  = useRef<HTMLDivElement>(null)
  const dragHandleRef = useRef<HTMLDivElement>(null)

  // onClose 를 ref 로 감싸서 네이티브 이벤트 핸들러에서 최신 값 참조
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  // 열림 애니메이션
  useEffect(() => { const t = setTimeout(() => setOpen(true), 16); return () => clearTimeout(t) }, [])

  // 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // ── 하드웨어 뒤로가기 → 모달 닫기 ─────────────────────────────────────
  useEffect(() => {
    window.history.pushState({ editModalSentinel: true }, '')
    const onPop = () => { onCloseRef.current() }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (window.history.state?.editModalSentinel) {
        window.history.back()
      }
    }
  }, [])

  // ── 스와이프 다운 — 네이티브 터치 리스너 (React 배치 우회, 60fps) ─────
  useEffect(() => {
    const handle = dragHandleRef.current
    const sheet  = sheetWrapRef.current
    if (!handle || !sheet) return

    let startY = 0
    let dragY  = 0
    let active = false

    const CLOSE_THRESHOLD = 160   // 이 이상 내려간 채로 손 떼야 닫힘
    const HINT_START      = 60    // 여기부터 살짝 투명해지기 시작

    const onStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      dragY  = 0
      active = true
      sheet.style.transition = 'none'
    }

    const onMove = (e: TouchEvent) => {
      if (!active) return
      dragY = Math.max(0, e.touches[0].clientY - startY)
      sheet.style.transform = `translateY(${dragY}px)`
      // 드래그 거리에 따라 살짝 투명 — 닫힘 구간 시각 피드백
      const opacity = dragY < HINT_START
        ? 1
        : Math.max(0.55, 1 - (dragY - HINT_START) / (CLOSE_THRESHOLD * 1.5))
      sheet.style.opacity = String(opacity)
    }

    const onEnd = () => {
      if (!active) return
      active = false
      sheet.style.opacity = ''

      if (dragY > CLOSE_THRESHOLD) {
        // 화면 밖으로 밀어낸 뒤 닫기
        const h = sheet.offsetHeight
        sheet.style.transition = 'transform 320ms ease-in, opacity 320ms ease-in'
        sheet.style.transform  = `translateY(${h}px)`
        sheet.style.opacity    = '0'
        setTimeout(() => onCloseRef.current(), 320)
      } else {
        // 스냅 백 (위로 다시 올리거나 애매하게 당겼을 때)
        sheet.style.transition = 'transform 300ms cubic-bezier(0.34,1.56,0.64,1), opacity 200ms ease-out'
        sheet.style.transform  = 'translateY(0)'
        sheet.style.opacity    = '1'
        setTimeout(() => {
          sheet.style.transition = ''
          sheet.style.transform  = ''
          sheet.style.opacity    = ''
        }, 300)
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

  // ── 파일 핸들러 ──────────────────────────────────────────────────────
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
        <div className="mx-auto max-w-sm rounded-t-3xl border border-white/10 bg-[#161B26]/98 px-5 pt-5 pb-10 backdrop-blur-xl">

          {/* ── 드래그 핸들 + 헤더 (네이티브 터치 리스너 부착 대상) ── */}
          <div ref={dragHandleRef}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

            {/* 헤더 */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-light text-white/30">기록 편집</p>
                <p className="text-sm font-bold text-white">{cityLabel(course.gpxPoints)}</p>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40 active:opacity-60"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* 사진 슬라이더 or 첨부 버튼 */}
          {photos.length > 0 ? (
            <div
              className="relative mb-3 h-36 overflow-hidden rounded-2xl"
              onTouchStart={e => { touchX.current = e.touches[0].clientX }}
              onTouchEnd={e => {
                const dx = e.changedTouches[0].clientX - touchX.current
                if (Math.abs(dx) < 40) return
                if (dx < 0 && currentIdx < photos.length - 1) setCurrentIdx(i => i + 1)
                if (dx > 0 && currentIdx > 0) setCurrentIdx(i => i - 1)
              }}
            >
              <div
                className="flex h-full transition-transform duration-300 ease-out"
                style={{
                  width:     `${photos.length * 100}%`,
                  transform: `translateX(-${(currentIdx * 100) / photos.length}%)`,
                }}
              >
                {photos.map((url, i) => (
                  <div key={i} style={{ width: `${100 / photos.length}%` }} className="h-full shrink-0">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowActionSheet(true)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/70 backdrop-blur-sm active:opacity-60"
              >
                <MoreHorizontal size={14} strokeWidth={2} />
              </button>

              {photos.length > 1 && (
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {photos.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] py-4 text-xs font-light text-white/30 active:opacity-60"
            >
              <Image size={13} strokeWidth={1.5} />
              대표 사진 첨부하기
            </button>
          )}

          {/* 후기 */}
          <textarea
            value={diary}
            onChange={e => setDiary(e.target.value)}
            placeholder="오늘 주행 후기를 남겨보세요 🏍️"
            rows={3}
            maxLength={200}
            className="mb-1 w-full resize-none rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-3 text-sm font-light text-white outline-none placeholder:text-white/20 focus:border-[#FF5A00]/30 transition-colors"
          />
          <p className="mb-4 text-right text-[10px] font-light text-white/20">{diary.length}/200</p>

          <button
            onClick={() => onSave(course.id, diary, photos)}
            className="flex w-full items-center justify-center gap-2 rounded-3xl bg-[#FF5A00] py-4 text-sm font-bold text-white active:opacity-80"
          >
            <CheckCircle size={15} strokeWidth={2} />
            저장하기
          </button>
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
