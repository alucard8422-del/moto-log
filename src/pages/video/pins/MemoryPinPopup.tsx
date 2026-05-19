// MemoryPinPopup.tsx — 추억 핀 생성 바텀시트
// 일시정지 + 롱프레스 → 표시. 사진 선택 + 메모 입력 후 onSave 호출.

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ImagePlus, MapPin, X, Save, Loader2 } from 'lucide-react'
import { compressPhoto } from '../../../lib/memoryPins'
import type { MemoryPin } from './pinTypes'

interface Props {
  lat:      number
  lng:      number
  fraction: number   // 현재 재생 위치 (0~1)
  courseId: string
  onSave:   (pin: MemoryPin) => void
  onClose:  () => void
}

export default function MemoryPinPopup({ lat, lng, fraction, courseId, onSave, onClose }: Props) {
  const [photo,    setPhoto]    = useState<string | undefined>()
  const [memo,     setMemo]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const compressed = await compressPhoto(file)
      setPhoto(compressed)
    } catch {
      // 실패 시 무시
    } finally {
      setLoading(false)
    }
  }

  function handleSave() {
    const pin: MemoryPin = {
      id:        crypto.randomUUID(),
      courseId,
      lat,
      lng,
      fraction,
      photo,
      memo:      memo.trim() || undefined,
      createdAt: new Date().toISOString(),
    }
    onSave(pin)
  }

  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 z-[200]"
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0,  opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30 }}
    >
      {/* 딤 백드롭 (팝업 위만) */}
      <div
        className="absolute inset-x-0 bottom-full h-48 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"
      />

      <div className="relative rounded-t-3xl border-t border-white/10 bg-[#0d1321]/95 px-5 pb-8 pt-5 backdrop-blur-xl">

        {/* 핸들 */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />

        {/* 헤더 */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin size={15} strokeWidth={1.5} className="text-teal-400" />
            <span className="text-sm font-bold text-white">추억 핀 추가</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 active:opacity-60"
          >
            <X size={14} strokeWidth={1.5} className="text-white/60" />
          </button>
        </div>

        {/* 위치 표시 */}
        <div className="mb-4 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2">
          <p className="text-[10px] font-light text-white/30">위치</p>
          <p className="text-[11px] font-mono text-white/50">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </p>
        </div>

        {/* 사진 선택 */}
        <div className="mb-3">
          {/* accept에 구체적 MIME 타입 지정 → Android/iOS에서 카메라 선택창 없이 갤러리 직접 열림 */}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={handleFileChange}
          />
          {photo ? (
            /* 사진 선택됨 — 소형 인디케이터 (대형 미리보기 대신) */
            <div className="flex items-center gap-3 rounded-2xl border border-teal-400/25 bg-teal-400/8 px-3 py-2.5">
              <img
                src={photo}
                alt=""
                className="h-11 w-11 flex-shrink-0 rounded-xl object-cover ring-1 ring-white/15"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-teal-400">사진 선택됨</p>
                <p className="text-[10px] font-light text-white/35 mt-0.5">핀 아이콘에 표시됩니다</p>
              </div>
              <button
                onClick={() => setPhoto(undefined)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/8 active:opacity-70"
              >
                <X size={12} strokeWidth={2} className="text-white/50" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] py-4 active:opacity-70 disabled:opacity-40"
            >
              {loading
                ? <Loader2 size={16} strokeWidth={1.5} className="animate-spin text-teal-400" />
                : <ImagePlus size={16} strokeWidth={1.5} className="text-white/40" />
              }
              <span className="text-[11px] font-light text-white/40">
                {loading ? '압축 중…' : '갤러리에서 사진 추가 (선택)'}
              </span>
            </button>
          )}
        </div>

        {/* 메모 */}
        <textarea
          value={memo}
          onChange={e => setMemo(e.target.value)}
          placeholder="이 장소에 대한 메모 (선택)"
          maxLength={200}
          rows={2}
          className="mb-4 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-light text-white placeholder-white/25 outline-none focus:border-teal-400/30"
        />

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={!photo && !memo.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-400 py-3.5 text-sm font-bold text-slate-950 active:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Save size={14} strokeWidth={2.5} />
          핀 저장
        </button>
      </div>
    </motion.div>
  )
}
