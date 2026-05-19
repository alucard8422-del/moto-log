// MemoryPinCard.tsx — 재생 중 핀 근처 도달 시 표시되는 플로팅 카드
// 표시 여부는 VideoPreviewPage가 결정. 카드는 UI만 담당.

import { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, X, ZoomIn } from 'lucide-react'
import type { MemoryPin } from './pinTypes'

interface Props {
  pin:      MemoryPin
  onClose:  () => void
}

export default function MemoryPinCard({ pin, onClose }: Props) {
  const [fullPhoto, setFullPhoto] = useState(false)

  return (
    <>
      {/* 플로팅 카드 */}
      <motion.div
        className="absolute inset-x-4 z-[150]"
        style={{ bottom: '240px' }}    // 하단 컨트롤 위에 표시
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        exit={{    opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      >
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0d1321]/90 backdrop-blur-xl shadow-2xl shadow-black/40">

          {/* 사진 (있을 때) */}
          {pin.photo && (
            <div className="relative">
              <img
                src={pin.photo}
                alt="추억 사진"
                className="h-36 w-full object-cover"
              />
              {/* 확대 버튼 */}
              <button
                onClick={() => setFullPhoto(true)}
                className="absolute right-2 bottom-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm active:opacity-70"
              >
                <ZoomIn size={12} strokeWidth={2} className="text-white" />
              </button>
            </div>
          )}

          <div className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="flex items-start gap-2 min-w-0">
              <MapPin size={13} strokeWidth={1.5} className="mt-0.5 shrink-0 text-teal-400" />
              <div className="min-w-0">
                <p className="text-[10px] font-light text-white/30">추억 핀</p>
                {pin.memo ? (
                  <p className="mt-0.5 text-[11px] font-light leading-snug text-white/70 line-clamp-2">
                    {pin.memo}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[11px] font-light text-white/30">메모 없음</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 active:opacity-60"
            >
              <X size={12} strokeWidth={1.5} className="text-white/60" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* 사진 전체보기 */}
      {fullPhoto && pin.photo && (
        <motion.div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setFullPhoto(false)}
        >
          <img
            src={pin.photo}
            alt="추억 사진 전체보기"
            className="max-h-full max-w-full object-contain"
          />
          <button
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md active:opacity-70"
            onClick={() => setFullPhoto(false)}
          >
            <X size={18} strokeWidth={1.5} className="text-white" />
          </button>
        </motion.div>
      )}
    </>
  )
}
