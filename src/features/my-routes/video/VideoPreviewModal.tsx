// VideoPreviewModal.tsx — ⑦ 완성된 영상 확인 팝업
// 전체화면 오버레이 위에 비디오 플레이어 + 다운로드 버튼

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Share2 } from 'lucide-react'
import type { ViewOption } from './videoTypes'

interface Props {
  blob:    Blob | null      // null → 닫힘
  view:    ViewOption | null
  onClose: () => void
}

export default function VideoPreviewModal({ blob, view, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const urlRef   = useRef<string | null>(null)

  useEffect(() => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    urlRef.current = url
    if (videoRef.current) {
      videoRef.current.src = url
      videoRef.current.play().catch(() => {})
    }
    return () => URL.revokeObjectURL(url)
  }, [blob])

  // ESC 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handleDownload() {
    if (!urlRef.current) return
    const a = document.createElement('a')
    a.href = urlRef.current
    a.download = `moto-log-${view?.id ?? 'video'}-${Date.now()}.webm`
    a.click()
  }

  return createPortal(
    <AnimatePresence>
      {blob && (
        <>
          {/* 딤 배경 */}
          <motion.div
            key="dim"
            className="fixed inset-0 z-[9000] bg-black/90 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* 모달 */}
          <motion.div
            key="modal"
            className="fixed inset-0 z-[9001] flex flex-col items-center justify-center px-4 py-8"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            {/* 상단 바 */}
            <div className="mb-3 flex w-full max-w-lg items-center justify-between">
              <div className="flex items-center gap-2">
                {view && <span className="text-xl">{view.emoji}</span>}
                <div>
                  <p className="text-sm font-bold text-white">{view?.name ?? '영상 미리보기'}</p>
                  <p className="text-[10px] font-light text-white/35">
                    {(blob.size / 1024 / 1024).toFixed(1)} MB · WebM / VP9
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 active:bg-white/10"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>

            {/* 비디오 */}
            <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
              <video
                ref={videoRef}
                controls
                loop
                playsInline
                className="w-full"
                style={{ aspectRatio: '16/9', objectFit: 'cover' }}
              />
            </div>

            {/* 하단 버튼 */}
            <div className="mt-4 flex w-full max-w-lg gap-3">
              <button
                onClick={handleDownload}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/20 py-3 text-sm font-bold text-violet-300 active:opacity-70 transition-opacity"
              >
                <Download size={15} strokeWidth={2} />
                다운로드
              </button>
              <button
                onClick={async () => {
                  if (!blob) return
                  const file = new File([blob], `moto-log-${view?.id ?? 'video'}.webm`, { type: blob.type })
                  if (navigator.canShare?.({ files: [file] })) {
                    try { await navigator.share({ files: [file] }) } catch {}
                  } else {
                    handleDownload()
                  }
                }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white/50 active:opacity-70 transition-opacity"
              >
                <Share2 size={15} strokeWidth={1.5} />
                공유
              </button>
            </div>

            {/* 힌트 */}
            <p className="mt-4 text-[10px] font-light text-white/20">
              영상은 WebM 포맷으로 저장됩니다 · iOS Safari는 MP4 변환 필요
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
