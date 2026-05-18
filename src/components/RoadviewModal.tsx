// RoadviewModal.tsx — 카카오 로드뷰 전체화면 팝업
// 사용: <RoadviewModal lat={...} lng={...} onClose={...} />
// 드래그로 360° 회전은 카카오 Roadview 가 자체 처리

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Loader2 } from 'lucide-react'

interface Props {
  lat: number
  lng: number
  onClose: () => void
}

type Status = 'loading' | 'ok' | 'none'

export default function RoadviewModal({ lat, lng, onClose }: Props) {
  const rvRef   = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    if (!rvRef.current || !window.kakao?.maps) return

    const position = new window.kakao.maps.LatLng(lat, lng)
    const client   = new window.kakao.maps.RoadviewClient()

    client.getNearestPanoId(position, 50, (panoId: string | null) => {
      if (!panoId) { setStatus('none'); return }
      if (!rvRef.current) return
      const rv = new window.kakao.maps.Roadview(rvRef.current)
      rv.setPanoId(panoId, position)
      setStatus('ok')
    })
  }, [lat, lng])

  return (
    <motion.div
      className="fixed inset-0 z-[3000] flex flex-col"
      style={{ background: '#070B12' }}
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ type: 'spring', stiffness: 340, damping: 32 }}
    >
      {/* 헤더 */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-white/5 px-5 py-3">
        <div className="flex items-center gap-2">
          <Camera size={15} strokeWidth={1.5} className="text-teal-400" />
          <span className="text-sm font-bold text-white/80">로드뷰</span>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 active:opacity-60"
        >
          <X size={17} strokeWidth={1.5} className="text-white/70" />
        </button>
      </div>

      {/* 로드뷰 영역 */}
      <div className="relative flex-1">
        {/* 카카오 Roadview 컨테이너 */}
        <div ref={rvRef} style={{ position: 'absolute', inset: 0 }} />

        {/* 로딩 */}
        <AnimatePresence>
          {status === 'loading' && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#070B12]"
              exit={{ opacity: 0 }}
            >
              <Loader2 size={28} strokeWidth={1.5} className="animate-spin text-teal-400/60" />
              <p className="text-xs font-light text-white/30">로드뷰 불러오는 중…</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 로드뷰 없음 */}
        {status === 'none' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/5 bg-white/[0.03]">
              <Camera size={28} strokeWidth={1} className="text-white/20" />
            </div>
            <div className="text-center">
              <p className="mb-1 text-sm font-bold text-white/50">이 위치에 로드뷰가 없어요</p>
              <p className="text-xs font-light text-white/25">반경 50m 내 카카오 로드뷰 데이터 없음</p>
            </div>
          </div>
        )}

        {/* 조작 힌트 */}
        {status === 'ok' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
            <span className="rounded-full border border-white/10 bg-black/50 px-4 py-1.5 text-[10px] font-light text-white/50 backdrop-blur-sm">
              드래그해서 360° 둘러보기
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
