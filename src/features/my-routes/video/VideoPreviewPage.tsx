// VideoPreviewPage.tsx — GPX 경로 미리보기
// 재생 중 뷰 각도·배속 실시간 변경 / 화면 탭으로 일시정지·재생

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Clapperboard, RotateCcw, ImagePlus, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { loadCourses } from '../../../lib/courseStorage'
import { parseGpxPoints } from '../../../constants/sampleGpxData'
import {
  loadPins, savePins, savePin, deletePin,
  extractExifGps, findClosestFraction, distToRoute, compressPhoto,
} from '../../../lib/memoryPins'
import MapboxPreview from './MapboxPreview'
import { VIEW_OPTIONS, type ViewOption } from './videoTypes'
import type { GpxPoint } from '../../../constants/sampleGpxData'
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

  const [points,          setPoints]         = useState<GpxPoint[]>([])
  const [pct,             setPct]            = useState(0)
  const [ended,           setEnded]          = useState(false)
  const [view,            setView]           = useState<ViewOption>(initView)
  const [speed,           setSpeed]          = useState(0.25)
  const [previewKey,      setPreviewKey]     = useState(0)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const exitingRef = useRef(false)   // confirmExit 후 popstate 핸들러 재차단 방지

  // ── 하드웨어 백버튼 차단 (pushState 센티넬) ─────────────────────────────────
  // BrowserRouter 환경에서 useBlocker 는 동작하지 않으므로 raw history API 사용
  useEffect(() => {
    exitingRef.current = false
    window.history.pushState({ motoPreviewSentinel: true }, '')   // 초기 센티넬

    const onPop = () => {
      if (exitingRef.current) return
      // 일부 Android 브라우저는 popstate 핸들러 내 pushState를 묵시적으로 무시함
      // → setTimeout(0) 으로 이벤트 루프 이후에 실행해 브라우저 호환성 확보
      setTimeout(() => {
        if (!exitingRef.current) {
          window.history.pushState({ motoPreviewSentinel: true }, '')
        }
      }, 0)
      setShowExitConfirm(true)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])   // 마운트 1회

  function confirmExit() {
    exitingRef.current = true
    setShowExitConfirm(false)
    // go(-N) 은 히스토리 깊이에 따라 달라져 불안정 → 직접 경로로 이동
    navigate('/my-routes', { replace: true })
  }
  function cancelExit() {
    setShowExitConfirm(false)
    // 센티넬이 없는 상태면(popstate setTimeout 경쟁 등) 즉시 보충
    if (!window.history.state?.motoPreviewSentinel) {
      window.history.pushState({ motoPreviewSentinel: true }, '')
    }
  }

  // 일시정지 상태
  const [currentKmh, setCurrentKmh] = useState(0)
  const [mapStyle,  setMapStyle]  = useState<string>(MAP_STYLES[0].url)   // 기본: 위성+도로
  const [isPaused,    setIsPaused]    = useState(false)
  const [isDragging,  setIsDragging]  = useState(false)
  const seekFnRef      = useRef<((fraction: number) => void) | null>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const isDraggingRef  = useRef(false)

  // ── 추억 핀 ──────────────────────────────────────────────────────────────────
  const [pins,          setPins]        = useState<MemoryPin[]>([])
  const [pinPopup,      setPinPopup]    = useState<{ lat: number; lng: number; fraction: number } | null>(null)
  const [nearbyPin,     setNearbyPin]   = useState<MemoryPin | null>(null)
  // 사진 EXIF 자동 핀
  const [photoImporting, setPhotoImporting] = useState(false)
  const [importResult,   setImportResult]   = useState<{ added: number; noGps: number } | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const pinsRef            = useRef<MemoryPin[]>([])
  const nearbyPinRef       = useRef<MemoryPin | null>(null)
  const dismissedPinIdsRef = useRef(new Set<string>())
  const coordLookupRef     = useRef<((x: number, y: number) => { lat: number; lng: number } | null) | null>(null)
  const pinTapCheckRef     = useRef<((x: number, y: number) => MemoryPin | null) | null>(null)
  const isPausedRef        = useRef(isPaused)
  const pctRef             = useRef(pct)
  const endedRef           = useRef(ended)
  const pointerDownPos     = useRef<{ x: number; y: number } | null>(null)
  const longPressTimer     = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const longPressTriggered = useRef(false)
  // ── 슬라이드 카메라 회전 + 시점 리셋 ───────────────────────────────────────
  const manualRotateFnRef  = useRef<((delta: number) => void) | null>(null)
  const viewResetFnRef     = useRef<(() => void) | null>(null)
  const isDragRotating     = useRef(false)
  const dragRotatePrevX    = useRef(0)
  useEffect(() => { pinsRef.current     = pins     }, [pins])
  useEffect(() => { isPausedRef.current = isPaused }, [isPaused])
  useEffect(() => { pctRef.current      = pct      }, [pct])
  useEffect(() => { endedRef.current    = ended    }, [ended])

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

  // 위치 콜백 — 근처 핀 자동 표시 / 재생 중 멀어지면 자동 닫힘
  const handlePosition = useCallback((lat: number, lng: number) => {
    if (nearbyPinRef.current) {
      // 재생 중일 때만 자동 닫힘 — 정지 중에는 유지
      if (!isPausedRef.current) {
        const dist = haversineM(lat, lng, nearbyPinRef.current.lat, nearbyPinRef.current.lng)
        if (dist > 280) {   // 280m 이상 멀어지면 → 슬라이드다운으로 자동 닫힘
          dismissedPinIdsRef.current.add(nearbyPinRef.current.id)
          nearbyPinRef.current = null
          setNearbyPin(null)
        }
      }
      return
    }
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
    setIsPaused(prev => !prev)
  }

  // ── 지도 롱프레스 → 추억 핀 팝업 / 슬라이드 → 카메라 회전 ────────────────────
  function handleMapPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    isDragRotating.current     = false
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
    // ── 드래그 회전 진행 중 ───────────────────────────────────────────────────
    if (isDragRotating.current) {
      const delta = (e.clientX - dragRotatePrevX.current) * 0.35   // 0.35°/px
      dragRotatePrevX.current = e.clientX
      manualRotateFnRef.current?.(delta)
      return
    }

    if (!pointerDownPos.current) return
    const dx = e.clientX - pointerDownPos.current.x
    const dy = e.clientY - pointerDownPos.current.y

    if (Math.hypot(dx, dy) > 8) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = undefined

      // 정지·종료 상태 + 수평 방향이면 드래그 회전 모드 진입
      if ((isPausedRef.current || endedRef.current) && Math.abs(dx) >= Math.abs(dy)) {
        isDragRotating.current  = true
        dragRotatePrevX.current = e.clientX
        pointerDownPos.current  = null
        return
      }

      pointerDownPos.current = null
    }
  }

  function handleMapPointerUp() {
    clearTimeout(longPressTimer.current)
    longPressTimer.current = undefined

    // 드래그 회전 종료 — 탭 처리 없이 그냥 종료
    if (isDragRotating.current) {
      isDragRotating.current = false
      pointerDownPos.current = null
      longPressTriggered.current = false
      return
    }

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
    // 탐색 완료 → 추억 핀 상태 초기화 (새 위치부터 처음처럼 재감지)
    dismissedPinIdsRef.current.clear()
    nearbyPinRef.current = null
    setNearbyPin(null)
  }

  function handleReplay() {
    setPct(0)
    setEnded(false)
    setIsPaused(false)
    setPreviewKey(k => k + 1)
    // 다시보기 → 추억 핀 상태 완전 초기화
    dismissedPinIdsRef.current.clear()
    nearbyPinRef.current = null
    setNearbyPin(null)
    setPinPopup(null)
  }

  // ── 사진 EXIF 자동 추억핀 ────────────────────────────────────────────────
  async function handlePhotoImport(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    e.target.value = ''   // 동일 파일 재선택 허용

    setPhotoImporting(true)
    setImportResult(null)

    let added  = 0
    let noGps  = 0
    const newPins: MemoryPin[] = []

    for (const file of files) {
      try {
        const gps = await extractExifGps(file)
        if (!gps) { noGps++; continue }

        // 경로와 너무 멀면 (>5km) 스킵 — 다른 날 찍은 사진 방지
        const dist = distToRoute(gps.lat, gps.lng, points)
        if (dist > 5000) { noGps++; continue }

        const [photo, fraction] = await Promise.all([
          compressPhoto(file),
          Promise.resolve(findClosestFraction(gps.lat, gps.lng, points)),
        ])

        newPins.push({
          id:        crypto.randomUUID(),
          courseId:  courseId!,
          lat:       gps.lat,
          lng:       gps.lng,
          fraction,
          photo,
          memo:      undefined,
          createdAt: new Date().toISOString(),
        })
        added++
      } catch {
        noGps++
      }
    }

    if (newPins.length > 0) {
      savePins(newPins)
      setPins(prev => [...prev, ...newPins])
      // 새로 추가된 핀은 바로 카드 팝업되지 않도록 dismissedSet에 추가
      newPins.forEach(p => dismissedPinIdsRef.current.add(p.id))
    }

    setPhotoImporting(false)
    setImportResult({ added, noGps })
    setTimeout(() => setImportResult(null), 4000)
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
        onManualRotateReady={(fn) => { manualRotateFnRef.current = fn }}
        onViewResetReady={(fn)   => { viewResetFnRef.current   = fn }}
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

      {/* 정지 중 회전 힌트 */}
      {isPaused && !pinPopup && !nearbyPin && (
        <div className="pointer-events-none absolute inset-x-0 z-10 flex justify-center" style={{ bottom: '238px' }}>
          <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 backdrop-blur-sm">
            <span className="text-[10px] font-light text-white/40">← 슬라이드로 시점 회전 →</span>
          </div>
        </div>
      )}

      {/* 상단 헤더 */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center gap-3 px-4 pt-safe-top pb-3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <button
          onClick={() => setShowExitConfirm(true)}
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
                onClick={() => { setView(v); viewResetFnRef.current?.() }}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 transition-colors active:opacity-70 ${
                  active ? 'bg-[#FF5A00] text-white' : 'bg-white/8 border border-white/10'
                }`}
              >
                <span className="text-base leading-none">{v.emoji}</span>
                <span className={`text-[9px] font-bold leading-none ${active ? 'text-white' : 'text-white/50'}`}>
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
                className="h-full rounded-full bg-[#FF5A00]"
                style={{
                  width: `${pct}%`,
                  transition: isDragging ? 'none' : 'width 0.1s linear',
                }}
              />
            </div>
            {/* 썸 — 드래그 중에는 크게, 평소에는 작게 */}
            <div
              className={`absolute rounded-full bg-[#FF5A00] -translate-x-1/2 transition-all duration-150 ${
                isDragging
                  ? 'h-4 w-4 ring-2 ring-[#FF5A00]/40'
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

          {/* 사진으로 추억핀 */}
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={photoImporting}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/8 py-3.5 text-[12px] font-semibold text-white/70 active:opacity-70 disabled:opacity-50"
          >
            {photoImporting
              ? <Loader2 size={13} strokeWidth={2} className="animate-spin" />
              : <ImagePlus size={13} strokeWidth={2} />
            }
            사진 핀
          </button>

          <button
            onClick={handleMakeVideo}
            disabled={!ended}
            className={`flex flex-[2] items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-colors active:opacity-80 ${
              ended
                ? 'bg-[#FF5A00] text-white'
                : 'bg-[#FF5A00]/20 text-[#FF5A00]/50 cursor-not-allowed'
            }`}
          >
            <Clapperboard size={15} strokeWidth={2} />
            {ended ? `${view.emoji} 이대로 영상 만들기` : '경로 확인 중…'}
          </button>
        </div>

        {/* 숨겨진 파일 입력 */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoImport}
          className="hidden"
        />
      </div>

      {/* 사진 임포트 결과 토스트 */}
      <AnimatePresence>
        {importResult && (
          <motion.div
            className="absolute inset-x-4 z-[300] flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ bottom: '230px', background: 'rgba(15,20,35,0.92)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            {importResult.added > 0
              ? <CheckCircle size={18} strokeWidth={2} className="shrink-0 text-emerald-400" />
              : <AlertCircle size={18} strokeWidth={2} className="shrink-0 text-amber-400" />
            }
            <div className="flex-1">
              {importResult.added > 0 && (
                <p className="text-[13px] font-bold text-white">
                  추억 핀 {importResult.added}개 추가됨
                </p>
              )}
              {importResult.noGps > 0 && (
                <p className="text-[11px] font-light text-white/50">
                  GPS 정보 없는 사진 {importResult.noGps}개 제외
                </p>
              )}
              {importResult.added === 0 && importResult.noGps > 0 && (
                <p className="text-[13px] font-bold text-amber-300">
                  추가된 핀이 없어요
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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

      {/* ── 종료 확인 바텀시트 ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showExitConfirm && (
          <>
            {/* 딤 배경 */}
            <motion.div
              className="absolute inset-0 z-[400] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cancelExit}
            />

            {/* 바텀시트 */}
            <motion.div
              className="absolute inset-x-0 bottom-0 z-[401] rounded-t-3xl border-t border-white/10 bg-[#0d1321]/95 px-5 pb-10 pt-5 backdrop-blur-xl"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0,  opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            >
              {/* 핸들 */}
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/15" />

              {/* 텍스트 */}
              <p className="mb-1 text-center text-[15px] font-bold text-white">미리보기 종료</p>
              <p className="mb-7 text-center text-[13px] font-light leading-relaxed text-white/45">
                지금 나가면 미리보기가 종료됩니다.
              </p>

              {/* 버튼 */}
              <div className="flex gap-3">
                <button
                  onClick={cancelExit}
                  className="flex-1 rounded-2xl border border-white/15 bg-white/8 py-3.5 text-sm font-semibold text-white/70 active:opacity-70"
                >
                  계속 보기
                </button>
                <button
                  onClick={confirmExit}
                  className="flex-[1.2] rounded-2xl bg-red-500/85 py-3.5 text-sm font-bold text-white active:opacity-80"
                >
                  종료
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
