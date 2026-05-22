// PlaceSearchPanel.tsx — 카카오 장소검색으로 경유지 추가
import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, MapPin, Plus, Loader2, AlertCircle } from 'lucide-react'

interface PlaceResult {
  place_name:        string
  road_address_name: string
  address_name:      string
  x: string   // 경도 (lng)
  y: string   // 위도 (lat)
}

interface Props {
  isOpen:    boolean
  onClose:   () => void
  onAdd:     (lat: number, lng: number, name: string) => void
  onPreview: (lat: number, lng: number) => void   // 지도 이동만 (경유지 추가 X)
}

// 카카오 SDK services 로드 대기 (최대 5초)
function waitForKakaoPlaces(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.kakao?.maps?.services?.Places === 'function') {
      resolve(); return
    }
    let tries = 0
    const iv = setInterval(() => {
      if (typeof window.kakao?.maps?.services?.Places === 'function') {
        clearInterval(iv); resolve()
      } else if (++tries > 25) {   // 25 × 200ms = 5초
        clearInterval(iv); reject(new Error('Kakao Places not available'))
      }
    }, 200)
  })
}

export default function PlaceSearchPanel({ isOpen, onClose, onAdd, onPreview }: Props) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<PlaceResult[]>([])
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)
  const [error,    setError]    = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = useCallback(async () => {
    const q = query.trim()
    if (!q) return

    // 키보드 내리기
    inputRef.current?.blur()

    setLoading(true)
    setSearched(false)
    setError('')
    setResults([])

    try {
      // SDK 로드 대기
      await waitForKakaoPlaces()

      await new Promise<void>((resolve, reject) => {
        const ps = new window.kakao.maps.services.Places()
        // 타임아웃 안전장치 (10초)
        const timeout = setTimeout(() => reject(new Error('timeout')), 10_000)
        ps.keywordSearch(q, (data: PlaceResult[], status: string) => {
          clearTimeout(timeout)
          setLoading(false)
          setSearched(true)
          if (status === 'OK') {
            setResults(data.slice(0, 8))
          } else if (status === 'ZERO_RESULT') {
            setResults([])
          } else {
            reject(new Error(`status: ${status}`))
          }
          resolve()
        })
      })
    } catch (e) {
      setLoading(false)
      setSearched(true)
      setError('검색에 실패했어요. 잠시 후 다시 시도해주세요.')
      console.warn('[PlaceSearch] 검색 오류:', e)
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doSearch()
  }

  const handlePreview = (r: PlaceResult) => {
    // 행 탭 → 지도 이동만 (경유지 추가 X)
    onPreview(parseFloat(r.y), parseFloat(r.x))
  }

  const handleAdd = (e: React.MouseEvent, r: PlaceResult) => {
    e.stopPropagation()   // 행 탭(onPreview) 이벤트 차단
    onAdd(parseFloat(r.y), parseFloat(r.x), r.place_name)
  }

  const handleClose = () => {
    onClose()
    setQuery('')
    setResults([])
    setSearched(false)
    setError('')
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
                    onChange={e => { setQuery(e.target.value); setSearched(false); setResults([]) }}
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
              <div className="max-h-[168px] overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {error ? (
                  <div className="flex flex-col items-center gap-2 py-8">
                    <AlertCircle size={20} strokeWidth={1.5} className="text-rose-400/60" />
                    <p className="text-center text-[11px] font-light text-white/30">{error}</p>
                  </div>
                ) : results.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {results.map((r, i) => (
                      <div
                        key={i}
                        onClick={() => handlePreview(r)}
                        className="flex items-center gap-3 rounded-2xl px-3 py-3 active:bg-white/5 cursor-pointer"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8">
                          <MapPin size={14} strokeWidth={1.5} className="text-white/40" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-white">{r.place_name}</p>
                          <p className="truncate text-[11px] font-light text-white/35">
                            {r.road_address_name || r.address_name}
                          </p>
                        </div>
                        {/* + 버튼만 경유지 추가 */}
                        <button
                          onClick={e => handleAdd(e, r)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF5A00] active:opacity-70"
                        >
                          <Plus size={14} strokeWidth={2.5} className="text-white" />
                        </button>
                      </div>
                    ))}
                    <p className="pt-1 pb-2 text-center text-[10px] font-light text-white/20">
                      탭하면 경유지에 추가됩니다
                    </p>
                  </div>
                ) : searched ? (
                  <p className="py-8 text-center text-[11px] font-light text-white/25">
                    "{query}" 검색 결과가 없어요
                  </p>
                ) : loading ? (
                  <p className="py-6 text-center text-[11px] font-light text-white/20">
                    검색 중…
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
