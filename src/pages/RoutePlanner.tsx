// RoutePlanner.tsx — 지도 터치 기반 수동 경로 작성 + 2단계 확정 흐름
import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapContainer, TileLayer, Polyline, Marker, useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Trash2, MapPin, CheckCircle,
  CornerDownLeft, PenLine, RotateCcw,
} from 'lucide-react'
import {
  saveCourse, shareToCommunity, buildGpxXml,
  type SavedCourse,
} from '../lib/courseStorage'
import {
  KOREA_BOUNDS, KOREA_CENTER, KOREA_MIN_ZOOM,
  DARK_TILE_URL, DARK_TILE_SUBDOMAINS, DARK_TILE_MAX_ZOOM,
} from '../lib/mapConfig'

// ── 타입 ─────────────────────────────────────────────────────────────────────
type LatLng = { lat: number; lng: number }

// 화면 단계 — DRAW(그리기) → CONFIRM(입력/공유)
type Stage = 'DRAW' | 'CONFIRM'

// ── 하버사인 거리 계산 (km) ───────────────────────────────────────────────────
function haversine(a: LatLng, b: LatLng): number {
  const R    = 6371
  const dLat = (b.lat - a.lat) * (Math.PI / 180)
  const dLng = (b.lng - a.lng) * (Math.PI / 180)
  const x    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * (Math.PI / 180)) *
      Math.cos(b.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function totalDist(pts: LatLng[]): number {
  let d = 0
  for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i])
  return d
}

// ── 마커 divIcon 생성 ─────────────────────────────────────────────────────────
function makeIcon(label: string, bg: string, textColor = '#0F172A') {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:30px;height:30px;border-radius:50%;
      background:${bg};border:2.5px solid #fff;
      display:flex;align-items:center;justify-content:center;
      font-size:10px;font-weight:700;color:${textColor};
      box-shadow:0 2px 10px rgba(0,0,0,0.55);
      font-family:system-ui,sans-serif;
    ">${label}</div>`,
    iconSize:   [30, 30],
    iconAnchor: [15, 15],
  })
}

const ICONS = {
  start: () => makeIcon('S', '#2DD4BF'),
  mid:   (n: number) => makeIcon(String(n), '#1E293B', '#94A3B8'),
  end:   () => makeIcon('E', '#F87171', '#fff'),
}

// ── 지도 클릭 이벤트 — locked 시 무시 ─────────────────────────────────────────
function MapClickHandler({
  onAdd,
  locked,
}: {
  onAdd:  (p: LatLng) => void
  locked: boolean
}) {
  useMapEvents({
    click(e) {
      if (locked) return   // CONFIRM 단계에서 추가 입력 차단
      onAdd({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

// ── 웨이포인트 마커 — 클릭 시 해당 인덱스 삭제 (DRAW 단계에서만) ──────────────
function WaypointMarkers({
  points,
  onRemove,
  locked,
}: {
  points:   LatLng[]
  onRemove: (index: number) => void
  locked:   boolean
}) {
  return (
    <>
      {points.map((p, i) => {
        const isStart = i === 0
        const isEnd   = i === points.length - 1 && points.length > 1
        const icon    = isStart ? ICONS.start() : isEnd ? ICONS.end() : ICONS.mid(i + 1)
        return (
          <Marker
            key={`wp-${i}`}
            position={[p.lat, p.lng]}
            icon={icon}
            // locked(CONFIRM) 단계에서는 삭제 불가 — 지도 인터랙션 자체가 차단됨
            eventHandlers={locked ? {} : {
              click: (e) => {
                // 마커 클릭이 지도 클릭 이벤트로 전파되지 않도록 차단
                L.DomEvent.stopPropagation(e)
                onRemove(i)
              },
            }}
          />
        )
      })}
    </>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function RoutePlanner() {
  const navigate              = useNavigate()
  const [points, setPoints]   = useState<LatLng[]>([])
  const [stage, setStage]     = useState<Stage>('DRAW')
  const [title, setTitle]     = useState('')
  const [tip, setTip]         = useState('')
  const [done, setDone]       = useState(false)
  const titleRef              = useRef<HTMLInputElement>(null)

  const polyline  = points.map(p => [p.lat, p.lng] as [number, number])
  const dist      = totalDist(points)
  const locked    = stage === 'CONFIRM'

  // 유효성: 확정 단계 + 제목 1자 이상
  const canShare  = locked && title.trim().length >= 1 && !done

  const handleAdd = useCallback((p: LatLng) => {
    setPoints(prev => [...prev, p])
  }, [])

  const handleUndo   = () => setPoints(prev => prev.slice(0, -1))
  const handleClear  = () => { setPoints([]); setStage('DRAW') }
  // 마커 재터치 → 해당 인덱스만 제거 → 폴리라인·거리·순번 자동 재계산
  const handleRemove = useCallback((index: number) => {
    setPoints(prev => prev.filter((_, i) => i !== index))
  }, [])

  // 경로 확정 → CONFIRM 단계 전환 + 입력 필드 자동 포커스
  const handleConfirm = () => {
    setStage('CONFIRM')
    setTimeout(() => titleRef.current?.focus(), 400)  // 패널 애니메이션 후 포커스
  }

  // 다시 수정하기 → DRAW 단계 복귀 (포인트 유지)
  const handleReEdit = () => setStage('DRAW')

  const handleShare = () => {
    if (!canShare) return
    const now    = Date.now()
    const gpxPts = points.map((p, i) => ({ lat: p.lat, lng: p.lng, timestamp: now + i * 60000 }))
    const course: SavedCourse = {
      id:              crypto.randomUUID(),
      title:           title.trim(),
      distanceKm:      parseFloat(dist.toFixed(1)),
      durationMin:     Math.round((dist / 60) * 60),   // 평균 60km/h 기준
      gpxPoints:       gpxPts,
      gpxXml:          buildGpxXml(gpxPts),
      createdAt:       new Date().toISOString(),
      isShared:        true,
      communityShared: true,
      diary:           tip.trim() || undefined,
    }
    saveCourse(course)
    shareToCommunity(course.id)
    window.dispatchEvent(new CustomEvent('moto:community-updated'))
    setDone(true)
    setTimeout(() => navigate(-1), 1300)
  }

  return (
    <div className="relative" style={{ height: '100svh', overflow: 'hidden' }}>

      {/* ── 지도 (전체 화면) ── */}
      <MapContainer
        center={KOREA_CENTER}
        zoom={7}
        minZoom={KOREA_MIN_ZOOM}
        maxBounds={KOREA_BOUNDS}
        maxBoundsViscosity={0.8}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url={DARK_TILE_URL} subdomains={DARK_TILE_SUBDOMAINS} maxZoom={DARK_TILE_MAX_ZOOM} />
        <MapClickHandler onAdd={handleAdd} locked={locked} />

        {/* 폴리라인 — 글로우 + 실선 */}
        {polyline.length >= 2 && (
          <>
            <Polyline positions={polyline} pathOptions={{ color: '#2DD4BF', weight: 12, opacity: 0.15 }} />
            <Polyline positions={polyline} pathOptions={{ color: '#2DD4BF', weight: 3,  opacity: 0.9  }} />
          </>
        )}
        <WaypointMarkers points={points} onRemove={handleRemove} locked={locked} />
      </MapContainer>

      {/* ── CONFIRM 단계: 지도 터치 차단 오버레이 ── */}
      {locked && (
        <div className="absolute inset-0 z-[900] bg-black/20 backdrop-blur-[1px]" />
      )}

      {/* ── 상단 오버레이 바 ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-center justify-between px-4 pt-4">

        {/* 뒤로 가기 */}
        <button
          onClick={() => navigate(-1)}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 backdrop-blur-md transition-opacity active:opacity-60"
        >
          <ArrowLeft size={17} strokeWidth={1.5} className="text-white/80" />
        </button>

        {/* 타이틀 칩 + 거리 칩 */}
        <div className="pointer-events-none flex flex-col items-center gap-1">
          <span className="rounded-full border border-white/10 bg-slate-950/80 px-4 py-1.5 text-xs font-bold tracking-wider text-white/80 backdrop-blur-md">
            {locked ? '코스 정보 입력' : '경로 작성'}
          </span>
          {points.length >= 2 && (
            <span className="rounded-full bg-teal-400/20 px-3 py-1 text-[10px] font-bold text-teal-400">
              {dist.toFixed(1)} km · {points.length}개 포인트
            </span>
          )}
        </div>

        {/* DRAW 단계: 실행취소 + 초기화 버튼 */}
        <div className="pointer-events-auto flex gap-2">
          <AnimatePresence>
            {!locked && points.length > 0 && (
              <>
                <motion.button
                  key="undo"
                  onClick={handleUndo}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 backdrop-blur-md active:opacity-60"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                >
                  <CornerDownLeft size={15} strokeWidth={1.5} className="text-white/60" />
                </motion.button>
                <motion.button
                  key="clear"
                  onClick={handleClear}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 backdrop-blur-md active:opacity-60"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24, delay: 0.05 }}
                >
                  <Trash2 size={15} strokeWidth={1.5} className="text-rose-400" />
                </motion.button>
              </>
            )}
          </AnimatePresence>

          {/* CONFIRM 단계: 초기화만 */}
          {locked && (
            <button
              onClick={handleClear}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 backdrop-blur-md active:opacity-60"
            >
              <Trash2 size={15} strokeWidth={1.5} className="text-rose-400" />
            </button>
          )}
        </div>
      </div>

      {/* ── DRAW 단계: 빈 화면 안내 ── */}
      <AnimatePresence>
        {points.length === 0 && !locked && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-36 z-[900] flex flex-col items-center gap-3 px-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-teal-400/20 bg-slate-950/80 backdrop-blur-md">
              <MapPin size={20} strokeWidth={1.3} className="text-teal-400" />
            </div>
            <p className="text-center text-sm font-light text-white/50">
              지도를 터치해서<br />
              <span className="font-bold text-white/80">경유지를 추가</span>하세요
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DRAW 단계: [경로 확정] 버튼 — 2개 이상 포인트 시 등장 ── */}
      <AnimatePresence>
        {points.length >= 2 && !locked && (
          <motion.div
            key="confirm-btn"
            className="absolute bottom-10 inset-x-0 z-[1000] flex justify-center px-5"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            <button
              onClick={handleConfirm}
              className="flex items-center gap-2.5 rounded-2xl bg-teal-400 px-8 py-4 text-sm font-bold text-slate-950 shadow-xl shadow-teal-900/40 active:opacity-80"
            >
              <PenLine size={16} strokeWidth={2} />
              코스 확정
              <span className="ml-1 rounded-full bg-slate-950/20 px-2 py-0.5 text-[10px] font-bold">
                {dist.toFixed(1)} km
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CONFIRM 단계: 코스 정보 입력 패널 ── */}
      <AnimatePresence>
        {locked && (
          <motion.div
            key="info-panel"
            className="absolute bottom-0 inset-x-0 z-[1000]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="mx-auto w-full max-w-sm rounded-t-3xl border border-white/10 bg-[#0D1117]/97 px-5 pt-4 pb-10 backdrop-blur-2xl">
              {/* 핸들 */}
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />

              {/* 패널 헤더: 제목 + 다시 수정하기 */}
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[10px] font-light uppercase tracking-widest text-white/30">
                  코스 정보 입력
                </p>
                <button
                  onClick={handleReEdit}
                  className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 transition-opacity active:opacity-60"
                >
                  <RotateCcw size={10} strokeWidth={2} className="text-white/40" />
                  <span className="text-[10px] font-light text-white/40">다시 수정하기</span>
                </button>
              </div>

              {/* 코스 이름 — 필수 입력 */}
              <div className="mb-3">
                <label className="mb-1.5 flex items-center gap-1 text-[10px] font-light uppercase tracking-widest text-white/30">
                  코스 이름
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  ref={titleRef}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="예: 대전 → 대청호 꿀바리 코스"
                  maxLength={40}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-teal-400/60 focus:bg-white/[0.07] transition-colors"
                />
                {/* 제목 미입력 시 유효성 힌트 */}
                {title.trim().length === 0 && (
                  <p className="mt-1.5 text-[10px] font-light text-rose-400/60">
                    코스 이름을 입력해야 공유할 수 있어요
                  </p>
                )}
              </div>

              {/* 한줄 팁 — 선택 입력 */}
              <div className="mb-5">
                <label className="mb-1.5 block text-[10px] font-light uppercase tracking-widest text-white/30">
                  한줄 팁 <span className="text-white/15">(선택)</span>
                </label>
                <input
                  value={tip}
                  onChange={e => setTip(e.target.value)}
                  placeholder="예: 대청호 뷰포인트에서 꼭 쉬어가세요!"
                  maxLength={60}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-teal-400/60 focus:bg-white/[0.07] transition-colors"
                />
              </div>

              {/* 공유하기 버튼 — 유효성 통과 시만 활성 */}
              <motion.button
                onClick={handleShare}
                disabled={!canShare}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all duration-300 ${
                  done
                    ? 'bg-teal-400/20 text-teal-400'
                    : canShare
                      ? 'bg-teal-400 text-slate-950 active:opacity-80'
                      : 'bg-white/5 text-white/20 cursor-not-allowed'
                }`}
                whileTap={canShare ? { scale: 0.97 } : {}}
              >
                {done ? (
                  <>
                    <CheckCircle size={16} strokeWidth={2} />
                    저장 완료 — 내 경로로 돌아갑니다
                  </>
                ) : (
                  <>
                    커뮤니티에 공유하기
                    {canShare && (
                      <span className="ml-1 rounded-full bg-slate-950/20 px-2 py-0.5 text-[10px]">
                        {dist.toFixed(1)} km
                      </span>
                    )}
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
