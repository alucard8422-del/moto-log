// PlaceSearchPanel.tsx — 카카오 장소검색으로 경유지 추가
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, MapPin, Plus, Loader2 } from 'lucide-react'

interface PlaceResult {
  place_name: string
  road_address_name: string
  address_name: string
  x: string  // 경도 (lng)
  y: string  // 위도 (lat)
}

interface Props {
  isOpen:   boolean
  onClose:  () => void
  onAdd:    (lat: number, lng: number, name: string) => void
}

export default function PlaceSearchPanel({ isOpen, onClose, onAdd }: Props) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<PlaceResult[]>([])
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = () => {
    const q = query.trim()
    if (!q || !window.kakao?.maps?.services) return
    setLoading(true)
    setSearched(false)
    const ps = new window.kakao.maps.services.Places()
    ps.keywordSearch(q, (data: PlaceResult[], status: string) => {
      setLoading(false)
      setSearched(true)
      if (status === window.kakao.maps.services.Status.OK) {
        setResults(data.slice(0, 8))
      } else {
        setResults([])
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch()
  }

  const handleAdd = (r: PlaceResult) => {
    onAdd(parseFloat(r.y), parseFloat(r.x), r.place_name)
    onClose()
    setQuery('')
    setResults([])
    setSearched(false)
  }

  const handleClose = () => {
    onClose()
    setQuery('')
    setResults([])
    setSearched(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[1070] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[1080] mx-auto max-w-sm"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          >
            <div className="rounded-t-3xl border-t border-white/10 bg-[#0D1117]/97 px-4 pt-3 pb-8 backdrop-blur-2xl">
              {/* 핸들 + 헤더 */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-8 rounded-full bg-white/20" />
                  <span className="text-[11px] font-light uppercase tracking-widest text-white/30">
                    장소 검색
                  </span>
                </div>
                <button onClick={handleClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 active:opacity-60">
                  <X size={13} strokeWidth={1.5} className="text-white/40" />
                </button>
              </div>

              {/* 검색창 */}
              <div className="mb-3 flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    ref={inputRef}
                    autoFocus
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="장소 이름 또는 주소 검색"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-9 pr-4 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#FF5A00]/60"
                  />
                </div>
                <button
                  onClick={doSearch}
                  disabled={!query.trim() || loading}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FF5A00] active:opacity-70 disabled:opacity-40"
                >
                  {loading
                    ? <Loader2 size={16} strokeWidth={2} className="animate-spin text-white" />
                    : <Search size={16} strokeWidth={2} className="text-white" />
                  }
                </button>
              </div>

              {/* 결과 목록 */}
              <div className="max-h-72 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {results.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {results.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => handleAdd(r)}
                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left active:bg-white/10"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF5A00]/15">
                          <MapPin size={14} strokeWidth={1.5} className="text-[#FF5A00]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-white">{r.place_name}</p>
                          <p className="truncate text-[11px] font-light text-white/35">
                            {r.road_address_name || r.address_name}
                          </p>
                        </div>
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FF5A00]/15">
                          <Plus size={13} strokeWidth={2} className="text-[#FF5A00]" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searched ? (
                  <p className="py-8 text-center text-[11px] font-light text-white/25">
                    검색 결과가 없어요
                  </p>
                ) : (
                  <p className="py-6 text-center text-[11px] font-light text-white/20">
                    장소를 검색하면 탭 한 번으로 경유지에 추가됩니다
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
