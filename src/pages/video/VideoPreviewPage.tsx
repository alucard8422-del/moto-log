// VideoPreviewPage.tsx — GPX 경로 미리보기
// 재생 중 뷰 각도·배속 실시간 변경 / 화면 탭으로 일시정지·재생

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Clapperboard, RotateCcw } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { loadCourses } from '../../lib/courseStorage'
import { parseGpxPoints } from '../../data/sampleGpxData'
import { loadPins, savePin, deletePin } from '../../lib/memoryPins'
import MapboxPreview from './MapboxPreview'
import { VIEW_OPTIONS, type ViewOption } from './videoTypes'
import type { GpxPoint } from '../../data/sampleGpxData'
import type { MemoryPin } from './pins/pinTypes'
import MemoryPinPopup from './pins/MemoryPinPopup'
import MemoryPinCard from './pins/MemoryPinCard'

// 두 좌표 간 거리 (미터)
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6_371_000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// 배속 옵션 — 최소 0.005×, 최대 2×
const SPEED_OPTIONS: [string, number][] = [
  ['0.005×', 0.005],
  ['0.05×',  0.05 ],
  ['0.25×',  0.25 ],
  ['1×',     1    ],
  ['2×',     2    ],
]

// 지도 스타일 옵션
const MAP_STYLES = [
  { id: 'satellite', label: '위성',  emoji: '🛰️', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  { id: 'outdoors',  label: '지형',  emoji: '🏔️', url: 'mapbox://styles/mapbox/outdoors-v12'          },
  { id: 'navi',      label: '내비',  emoji: '🗺️', url: 'mapbox://styles/mapbox/navigation-day-v1'     },
  { id: 'dark',      label: '다크',  emoji: '🌙', url: 'mapbox://styles/mapbox/dark-v11'               },
] as const

export default function VideoPreviewPage() {
  const { courseId }   = useParams<{ courseId: string }>()
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()

  const initView = VIEW_OPTIONS.find(v => v.id === searchParams.get('view')) ?? VIEW_OPTIONS[0]

  const [points,     setPoints]     = useState<GpxPoint[]>([])
  const [pct,        setPct]        = useState(0)
  const [ended,      setEnded]      = useState(false)
  const [view,       setView]       = useState<ViewOption>(initView)
  const [speed,      setSpeed]      = useState(0.25)
  const [previewKey, setPreviewKey] = useState(0)

  // 일시정지 상태
  const [currentKmh, setCurrentKmh] = useState(0)
  const [mapStyle,  setMapStyle]  = useState<string>(MAP_STYLES[0].url)   // 기본: 위성+도로
  const [isPaused,    setIsPaused]    = useState(false)
  const [isDragging,  setIsDragging]  = useState(false)
  const seekFnRef      = useRef<((fraction: number) => void) | null>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const isDraggingRef  = useRef(false)
  // 아이콘 애니메이션 트리거 (숫자가 바뀔 때마다 key 변경 → CSS 재실행)
  const [iconKey,   setIconKey]   = useState(0)
  const [iconType,  setIconType]  = useState<'pause' | 'play'>('pause')
  const iconTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [iconVisible, setIconVisible] = useState(false)

  // ── 추억 핀 ──────────────────────────────────────────────────────────────────
  const [pins,      setPins]      = useState<MemoryPin[]>([])
  const [pinPopup,  setPinPopup]  = useState<{ lat: number; lng: number; fraction: number } | null>(null)
  const [nearbyPin, setNearbyPin] = useState<MemoryPin | null>(null)
  const pinsRef            = useRef<MemoryPin[]>([])
  const nearbyPinRef       = useRef<MemoryPin | null>(null)
  const dismissedPinIdsRef = useRef(new Set<string>())
  const coordLookupRef     = useRef<((x: number, y: number) => { lat: number; lng: number } | null) | null>(null)
  const pinTapCheckRef     = useRef<((x: number, y: number) => MemoryPin | null) | null>(null)
  const isPausedRef        = useRef(isPaused)
  const pctRef             = useRef(pct)
  const pointerDownPos     = useRef<{ x: number; y: number } | null>(null)
  const longPressTimer     = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const longPressTriggered = useRef(false)
  useEffect(() => { pinsRef.current    = pins     }, [pins])
  useEffect(() => { isPausedRef.current = isPaused }, [isPaused])
  useEffect(() => { pctRef.current     = pct      }, [pct])

  useEffect(() => {
    const courses = loadCourses()
    const course  = courses.find(c => c.id === courseId)
    if (!course) { navigate('/my-routes'); return }

    if (course.gpxXml && course.gpxXml.length > 50) {
      const parsed = parseGpxPoints(course.gpxXml)
      if (parsed.length >= 2) { setPoints(parsed); return }
    }
    setPoints(course.gpxPoints.map((p, i) => ({
      lat: p.lat, lng: p.lng, timestamp: i * 180_000,
    })))
  }, [courseId, navigate])

  // 핀 로드
  useEffect(() => {
    if (courseId) setPins(loadPins(courseId))
  }, [courseId])

  // 위치 콜백 — 재생 중 근처 핀(200m 이내) 자동 표시
  const handlePosition = useCallback((lat: number, lng: number) => {
    if (nearbyPinRef.current) return
    for (const pin of pinsRef.current) {
      if (dismissedPinIdsRef.current.has(pin.id)) continue
      if (haversineM(lat, lng, pin.lat, pin.lng) < 200) {
        nearbyPinRef.current = pin
        setNearbyPin(pin)
        return
      }
    }
  }, [])

  // 지도 영역 탭 → 일시정지·재생 토글
  function handleMapTap() {
    if (ended) return
    const next = !isPaused
    setIsPaused(next)
    setIconType(next ? 'pause' : 'play')
    setIconKey(k => k + 1)
    clearTimeout(iconTimerRef.current)
    setIconVisible(true)
    iconTimerRef.current = setTimeout(() => setIconVisible(false), 900)
  }

  // ── 지도 롱프레스 → 추억 핀 팝업 ────────────────────────────────────────────
  function handleMapPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    pointerDownPos.current     = { x: e.clientX, y: e.clientY }
    longPressTriggered.current = false
    longPressTimer.current     = setTimeout(() => {
      longPressTriggered.current = true
      if (isPausedRef.current && coordLookupRef.current && pointerDownPos.current) {
        const coord = coordLookupRef.current(pointerDownPos.current.x, pointerDownPos.current.y)
        if (coord) setPinPopup({ lat: coord.lat, lng: coord.lng, fraction: pctRef.current / 100 })
      }
    }, 600)
  }

  function handleMapPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointerDownPos.current) return
    const dx = e.clientX - pointerDownPos.current.x
    const dy = e.clientY - pointerDownPos.current.y
    if (Math.hypot(dx, dy) > 10) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = undefined
      pointerDownPos.current = null
    }
  }

  function handleMapPointerUp() {
    clearTimeout(longPressTimer.current)
    longPressTimer.current = undefined
    if (!longPressTriggered.current && pointerDownPos.current) {
      // 핀 탭 우선 확인 → 핀이면 카드 표시, 빈 곳이면 재생/일시정지
      const pos       = pointerDownPos.current
      const tappedPin = pinTapCheckRef.current?.(pos.x, pos.y) ?? null
      if (tappedPin) {
        nearbyPinRef.current = tappedPin
        setNearbyPin(tappedPin)
      } else {
        handleMapTap()
      }
    }
    pointerDownPos.current     = null
    longPressTriggered.current = false
  }

  // ── Progress bar 탐색 ────────────────────────────────────────────────────
  function calcFraction(clientX: number): number {
    if (!progressBarRef.current) return 0
    const rect = progressBarRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }

  function doSeek(clientX: number) {
    const fraction = calcFraction(clientX)
    setPct(Math.round(fraction * 100))
    if (fraction < 1) setEnded(false)
    seekFnRef.current?.(fraction)
  }

  function handleProgressDown(e: React.PointerEvent<HTMLDivElement>) {
    isDraggingRef.current = true
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)  // 바 밖으로 드래그해도 추적
    doSeek(e.clientX)
  }

  function handleProgressMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return
    doSeek(e.clientX)
  }

  function handleProgressUp() {
    isDraggingRef.current = false
    setIsDragging(false)
  }

  function handleReplay() {
    setPct(0)
    setEnded(false)
    setIsPaused(false)
    setIconVisible(false)
    setPreviewKey(k => k + 1)
  }

  function handleStyleChange(url: string) {
    if (url === mapStyle) return
    setMapStyle(url)
    // previewKey를 올리지 않음 → 맵이 재시작되지 않고 스타일만 교체
    // MapboxPreview 내부에서 map.setStyle() 호출 후 레이어 재등록
  }

  function handleMakeVideo() {
    navigate(`/video-creator/${courseId}?view=${view.id}`)
  }

  if (points.length < 2) return null

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">

      {/* 맵 */}
      <MapboxPreview
        key={previewKey}
        points={points}
        view={view}
        speed={speed}
        isPaused={isPaused}
        mapStyle={mapStyle}
        onProgress={setPct}
        onSpeed={setCurrentKmh}
        onEnd={() => setEnded(true)}
        onSeekReady={(fn) => { seekFnRef.current = fn }}
        pins={pins}
        onCoordLookupReady={(fn) => { coordLookupRef.current = fn }}
        onPosition={handlePosition}
        onPinTapCheckReady={(fn) => { pinTapCheckRef.current = fn }}
      />

      {/* 탭·롱프레스 감지 오버레이 (컨트롤 영역 제외) */}
      <div
        className="absolute inset-x-0 top-0 z-10"
        style={{ bottom: '220px', touchAction: 'none' }}
        onPointerDown={handleMapPointerDown}
        onPointerMove={handleMapPointerMove}
        onPointerUp={handleMapPointerUp}
        onPointerCancel={handleMapPointerUp}
      />

      {/* 일시정지 / 재생 아이콘 */}
      {iconVisible && (
        <div
          key={iconKey}
          className="anim-icon-pop pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          style={{ bottom: '220px' }}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/55 backdrop-blur-md ring-1 ring-white/10">
            {iconType === 'pause' ? (
              /* ❚❚ 일시정지 */
              <div className="flex gap-[7px]">
                <div className="h-8 w-3 rounded-sm bg-white" />
                <div className="h-8 w-3 rounded-sm bg-white" />
              </div>
            ) : (
              /* ▶ 재생 */
              <svg viewBox="0 0 24 24" className="ml-1 h-10 w-10 fill-white">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* 상단 헤더 */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center gap-3 px-4 pt-safe-top pb-3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <button
          onClick={() => navigate(-1)}
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm active:opacity-70"
        >
          <ArrowLeft size={18} strokeWidth={1.5} className="text-white" />
        </button>
        <div>
          <p className="text-[10px] font-light text-white/40 tracking-wider uppercase">경로 미리보기</p>
          <p className="text-sm font-semibold text-white">{view.emoji} {view.name}</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* 일시정지 배지 */}
          {isPaused && !ended && (
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white/60 backdrop-blur-sm">
              ❚❚ 일시정지
            </span>
          )}
          {/* 속도 표시판 */}
          {!ended && (
            <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur-md min-w-[56px]">
              <span className="text-xl font-black tabular-nums leading-none text-white">
                {Math.round(currentKmh)}
              </span>
              <span className="text-[9px] font-light text-white/40 leading-none mt-0.5">km/h</span>
            </div>
          )}
        </div>
      </div>

      {/* 하단 컨트롤 */}
      <div className="absolute bottom-0 inset-x-0 z-10 px-4 pb-safe-bottom pt-3 bg-gradient-to-t from-black/85 to-transparent">

        {/* 지도 스타일 선택 */}
        <div className="mb-2 flex gap-1.5">
          {MAP_STYLES.map(s => {
            const active = mapStyle === s.url
            return (
              <button
                key={s.id}
                onClick={() => handleStyleChange(s.url)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-1.5 transition-colors active:opacity-70 ${
                  active ? 'bg-white/20 text-white' : 'bg-white/5 text-white/35 border border-white/8'
                }`}
              >
                <span className="text-sm leading-none">{s.emoji}</span>
                <span className="text-[10px] font-bold">{s.label}</span>
              </button>
            )
          })}
        </div>

        {/* 뷰 각도 선택 */}
        <div className="mb-2 flex gap-1.5">
          {VIEW_OPTIONS.map(v => {
            const active = view.id === v.id
            return (
              <button
                key={v.id}
                onClick={() => setView(v)}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 transition-colors active:opacity-70 ${
                  active ? 'bg-teal-400 text-slate-950' : 'bg-white/8 border border-white/10'
                }`}
              >
                <span className="text-base leading-none">{v.emoji}</span>
                <span className={`text-[9px] font-bold leading-none ${active ? 'text-slate-950' : 'text-white/50'}`}>
                  {v.name.replace('캠', '')}
                </span>
              </button>
            )
          })}
        </div>

        {/* 배속 선택 */}
        <div className="mb-3 flex items-center gap-1.5">
          <span className="shrink-0 text-[10px] font-light text-white/35 w-6">배속</span>
          {SPEED_OPTIONS.map(([label, val]) => {
            const active = speed === val
            return (
              <button
                key={val}
                onClick={() => setSpeed(val)}
                className={`flex-1 rounded-xl py-1.5 text-[11px] font-bold transition-colors active:opacity-70 ${
                  active
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/35 border border-white/8'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* 진행률 바 — 클릭·드래그로 원하는 위치로 즉시 이동 */}
        <div className="mb-3 flex items-center gap-3">
          <span className="w-8 text-right text-[10px] tabular-nums font-light text-white/40">{pct}%</span>

          {/* 터치 히트 영역 (h-5 = 20px, 실제 선은 3px) */}
          <div
            ref={progressBarRef}
            className="relative flex flex-1 cursor-pointer touch-none items-center"
            style={{ height: '20px' }}
            onPointerDown={handleProgressDown}
            onPointerMove={handleProgressMove}
            onPointerUp={handleProgressUp}
            onPointerCancel={handleProgressUp}
          >
            {/* 레일 */}
            <div className="absolute inset-x-0 h-[3px] rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-teal-400"
                style={{
                  width: `${pct}%`,
                  transition: isDragging ? 'none' : 'width 0.1s linear',
                }}
              />
            </div>
            {/* 썸 — 드래그 중에는 크게, 평소에는 작게 */}
            <div
              className={`absolute rounded-full bg-teal-400 -translate-x-1/2 transition-all duration-150 ${
                isDragging
                  ? 'h-4 w-4 ring-2 ring-teal-400/40'
                  : 'h-2.5 w-2.5 ring-1 ring-white/20'
              }`}
              style={{
                left: `${pct}%`,
                transition: isDragging ? 'width 0.15s, height 0.15s' : 'left 0.1s linear, width 0.15s, height 0.15s',
              }}
            />
          </div>

          <span className="w-8 text-[10px] font-light text-white/40">100%</span>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2 pb-2">
          <button
            onClick={handleReplay}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 py-3.5 text-sm font-semibold text-white/70 active:opacity-70"
          >
            <RotateCcw size={14} strokeWidth={2} />
            다시보기
          </button>

          <button
            onClick={handleMakeVideo}
            disabled={!ended}
            className={`flex flex-[2] items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-colors active:opacity-80 ${
              ended
                ? 'bg-teal-400 text-slate-950'
                : 'bg-teal-400/20 text-teal-400/50 cursor-not-allowed'
            }`}
          >
            <Clapperboard size={15} strokeWidth={2} />
            {ended ? `${view.emoji} 이대로 영상 만들기` : '경로 확인 중…'}
          </button>
        </div>
      </div>
      {/* 추억 핀 팝업 — 일시정지 + 롱프레스 시 표시 */}
      <AnimatePresence>
        {pinPopup && (
          <MemoryPinPopup
            lat={pinPopup.lat}
            lng={pinPopup.lng}
            fraction={pinPopup.fraction}
            courseId={courseId!}
            onSave={(pin) => {
              savePin(pin)
              // 저장 직후 카드 자동 팝업 방지 (이미 핀 지도에 표시됨)
              dismissedPinIdsRef.current.add(pin.id)
              setPins(prev => [...prev, pin])
              setPinPopup(null)
            }}
            onClose={() => setPinPopup(null)}
          />
        )}
      </AnimatePresence>

      {/* 근처 추억 핀 카드 — 재생 중 200m 이내 접근 시 표시 */}
      <AnimatePresence>
        {nearbyPin && !pinPopup && (
          <MemoryPinCard
            pin={nearbyPin}
            onClose={() => {
              dismissedPinIdsRef.current.add(nearbyPin.id)
              nearbyPinRef.current = null
              setNearbyPin(null)
            }}
            onDelete={() => {
              deletePin(nearbyPin.id)
              setPins(prev => prev.filter(p => p.id !== nearbyPin.id))
              nearbyPinRef.current = null
              setNearbyPin(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
