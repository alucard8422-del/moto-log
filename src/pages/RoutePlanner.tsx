// RoutePlanner.tsx — 카카오맵 기반 수동 경로 작성 + 2단계 확정 흐름
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Trash2, MapPin, CheckCircle,
  CornerDownLeft, PenLine, RotateCcw, BookmarkPlus, Users,
} from 'lucide-react'
import {
  saveCourse, shareToCommunity, buildGpxXml,
  type SavedCourse,
} from '../lib/courseStorage'

const KAKAO_APP_KEY = 'd2430786a3a92cc28ebf4f0a22993062'

declare global {
  interface Window { kakao: any }
}

// ── 타입 ──────────────────────────────────────────────────────────────────
type LatLng = { lat: number; lng: number }
type Stage  = 'DRAW' | 'CONFIRM'

// ── 하버사인 거리 계산 (km) ────────────────────────────────────────────────
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

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────
export default function RoutePlanner() {
  const navigate = useNavigate()

  const [points, setPoints] = useState<LatLng[]>([])
  const [stage,  setStage]  = useState<Stage>('DRAW')
  const [title,  setTitle]  = useState('')
  const [tip,    setTip]    = useState('')
  const [done,   setDone]   = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  // 카카오맵 DOM refs
  const mapContainerRef  = useRef<HTMLDivElement>(null)
  const mapRef           = useRef<any>(null)
  const polylineGlowRef  = useRef<any>(null)
  const polylineMainRef  = useRef<any>(null)
  const markersRef       = useRef<any[]>([])

  // locked 상태를 ref로도 유지 — 클릭 리스너 클로저 stale 방지
  const lockedRef = useRef(false)

  const dist   = totalDist(points)
  const locked = stage === 'CONFIRM'
  const canSave = locked && title.trim().length >= 1 && points.length >= 2 && !done

  // lockedRef 동기화
  useEffect(() => { lockedRef.current = locked }, [locked])

  // ── 카카오맵 초기화 (최초 1회) ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    const doInit = () => {
      if (cancelled || !mapContainerRef.current) return
      window.kakao.maps.load(() => {
        if (cancelled || !mapContainerRef.current) return
        const map = new window.kakao.maps.Map(mapContainerRef.current, {
          center: new window.kakao.maps.LatLng(36.3504, 127.3845),
          level: 7,
        })
        mapRef.current = map

        window.kakao.maps.event.addListener(map, 'click', (mouseEvent: any) => {
          if (lockedRef.current) return
          const ll = mouseEvent.getLatLng()
          setPoints(prev => [...prev, { lat: ll.getLat(), lng: ll.getLng() }])
        })
      })
    }

    const scriptId = 'kakao-map-script'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    if (window.kakao) {
      doInit()
    } else if (script) {
      script.addEventListener('load', doInit)
    } else {
      script = document.createElement('script')
      script.id = scriptId
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false`
      script.addEventListener('load', doInit)
      document.head.appendChild(script)
    }

    return () => { cancelled = true; mapRef.current = null }
  }, [])

  // ── 포인트 변경 시 마커·폴리라인 전체 재렌더 ────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return

    // 기존 마커 제거
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    // 기존 폴리라인 제거
    if (polylineGlowRef.current) polylineGlowRef.current.setMap(null)
    if (polylineMainRef.current) polylineMainRef.current.setMap(null)

    if (points.length === 0) return

    const path: any[] = []

    points.forEach((coord, index) => {
      const kakaoLatLng = new window.kakao.maps.LatLng(coord.lat, coord.lng)
      path.push(kakaoLatLng)

      const isStart = index === 0
      const isEnd   = index === points.length - 1 && points.length > 1
      const label   = isStart ? 'S' : isEnd ? 'E' : String(index)
      const bg      = isStart ? '#2DD4BF' : isEnd ? '#F87171' : '#1E293B'
      const color   = isStart ? '#0F172A' : '#fff'

      const content = `
        <div style="
          width:30px;height:30px;border-radius:50%;
          background:${bg};border:2.5px solid #fff;
          display:flex;align-items:center;justify-content:center;
          font-size:10px;font-weight:700;color:${color};
          box-shadow:0 2px 10px rgba(0,0,0,0.55);
          font-family:system-ui,sans-serif;cursor:pointer;
        " class="route-marker-btn">${label}</div>
      `

      const overlay = new window.kakao.maps.CustomOverlay({
        position: kakaoLatLng,
        content,
        yAnchor: 0.5,
      })
      overlay.setMap(mapRef.current)
      markersRef.current.push(overlay)
    })

    // 마커 클릭 → 해당 인덱스 삭제 (DOM 렌더 후 바인딩)
    setTimeout(() => {
      document.querySelectorAll('.route-marker-btn').forEach((el, idx) => {
        ;(el as HTMLElement).onclick = (e) => {
          e.stopPropagation()
          if (lockedRef.current) return
          setPoints(prev => prev.filter((_, i) => i !== idx))
        }
      })
    }, 100)

    // 폴리라인 그리기
    if (path.length >= 2) {
      polylineGlowRef.current = new window.kakao.maps.Polyline({
        path,
        strokeWeight: 12,
        strokeColor:  '#2DD4BF',
        strokeOpacity: 0.15,
        strokeStyle:  'solid',
      })
      polylineMainRef.current = new window.kakao.maps.Polyline({
        path,
        strokeWeight:  3,
        strokeColor:  '#2DD4BF',
        strokeOpacity: 0.9,
        strokeStyle:  'solid',
      })
      polylineGlowRef.current.setMap(mapRef.current)
      polylineMainRef.current.setMap(mapRef.current)
    }
  }, [points])

  // ── 핸들러 ────────────────────────────────────────────────────────────
  const handleUndo   = () => setPoints(prev => prev.slice(0, -1))
  const handleClear  = () => { setPoints([]); setStage('DRAW') }
  const handleConfirm = () => {
    setStage('CONFIRM')
    setTimeout(() => titleRef.current?.focus(), 400)
  }
  const handleReEdit = () => setStage('DRAW')

  const handleSave = (isPublic: boolean) => {
    if (!canSave) return
    const now    = Date.now()
    const gpxPts = points.map((p, i) => ({ lat: p.lat, lng: p.lng, timestamp: now + i * 60000 }))
    const course: SavedCourse = {
      id:              crypto.randomUUID(),
      title:           title.trim(),
      distanceKm:      parseFloat(dist.toFixed(1)),
      durationMin:     Math.round((dist / 60) * 60),
      gpxPoints:       gpxPts,
      gpxXml:          buildGpxXml(gpxPts),
      createdAt:       new Date().toISOString(),
      isShared:        isPublic,
      communityShared: isPublic,
      diary:           tip.trim() || undefined,
    }
    saveCourse(course)
    if (isPublic) {
      shareToCommunity(course.id)
      window.dispatchEvent(new CustomEvent('moto:community-updated'))
    }
    setDone(true)
    setTimeout(() => navigate(-1), 1200)
  }

  // ── 렌더 ──────────────────────────────────────────────────────────────
  return (
    <div className="relative" style={{ height: '100svh', overflow: 'hidden' }}>

      {/* 카카오맵 컨테이너 */}
      <div
        ref={mapContainerRef}
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* CONFIRM 단계: 지도 터치 차단 오버레이 */}
      {locked && (
        <div className="absolute inset-0 z-[900] bg-black/20 backdrop-blur-[1px]" />
      )}

      {/* ── 상단 오버레이 바 ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-center justify-between px-4 pt-4">

        {/* 뒤로 */}
        <button
          onClick={() => navigate(-1)}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 backdrop-blur-md transition-opacity active:opacity-60"
        >
          <ArrowLeft size={17} strokeWidth={1.5} className="text-white/80" />
        </button>

        {/* 중앙 칩 */}
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

        {/* 우측 버튼 */}
        <div className="pointer-events-auto flex gap-2">
          <AnimatePresence>
            {!locked && points.length > 0 && (
              <>
                <motion.button key="undo" onClick={handleUndo}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 backdrop-blur-md active:opacity-60"
                  initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}>
                  <CornerDownLeft size={15} strokeWidth={1.5} className="text-white/60" />
                </motion.button>
                <motion.button key="clear" onClick={handleClear}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 backdrop-blur-md active:opacity-60"
                  initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24, delay: 0.05 }}>
                  <Trash2 size={15} strokeWidth={1.5} className="text-rose-400" />
                </motion.button>
              </>
            )}
          </AnimatePresence>
          {locked && (
            <button onClick={handleClear}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 backdrop-blur-md active:opacity-60">
              <Trash2 size={15} strokeWidth={1.5} className="text-rose-400" />
            </button>
          )}
        </div>
      </div>

      {/* ── DRAW: 빈 화면 안내 ── */}
      <AnimatePresence>
        {points.length === 0 && !locked && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-36 z-[900] flex flex-col items-center gap-3 px-8"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}>
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

      {/* ── DRAW: 코스 확정 버튼 ── */}
      <AnimatePresence>
        {points.length >= 2 && !locked && (
          <motion.div key="confirm-btn"
            className="absolute bottom-10 inset-x-0 z-[1000] flex justify-center px-5"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}>
            <button onClick={handleConfirm}
              className="flex items-center gap-2.5 rounded-2xl bg-teal-400 px-8 py-4 text-sm font-bold text-slate-950 shadow-xl shadow-teal-900/40 active:opacity-80">
              <PenLine size={16} strokeWidth={2} />
              코스 확정
              <span className="ml-1 rounded-full bg-slate-950/20 px-2 py-0.5 text-[10px] font-bold">
                {dist.toFixed(1)} km
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CONFIRM: 코스 정보 입력 패널 ── */}
      <AnimatePresence>
        {locked && (
          <motion.div key="info-panel"
            className="absolute bottom-0 inset-x-0 z-[1000]"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
            <div className="mx-auto w-full max-w-sm rounded-t-3xl border border-white/10 bg-[#0D1117]/97 px-5 pt-4 pb-10 backdrop-blur-2xl">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />

              <div className="mb-4 flex items-center justify-between">
                <p className="text-[10px] font-light uppercase tracking-widest text-white/30">코스 정보 입력</p>
                <button onClick={handleReEdit}
                  className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 transition-opacity active:opacity-60">
                  <RotateCcw size={10} strokeWidth={2} className="text-white/40" />
                  <span className="text-[10px] font-light text-white/40">다시 수정하기</span>
                </button>
              </div>

              {/* 코스 이름 */}
              <div className="mb-3">
                <label className="mb-1.5 flex items-center gap-1 text-[10px] font-light uppercase tracking-widest text-white/30">
                  코스 이름 <span className="text-rose-400">*</span>
                </label>
                <input
                  ref={titleRef}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="예: 대전 → 대청호 꿀바리 코스"
                  maxLength={40}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-teal-400/60 focus:bg-white/[0.07] transition-colors"
                />
                {title.trim().length === 0 && (
                  <p className="mt-1.5 text-[10px] font-light text-rose-400/60">코스 이름을 입력해야 공유할 수 있어요</p>
                )}
              </div>

              {/* 한줄 팁 */}
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

              {/* 저장 완료 or 듀얼 버튼 */}
              {done ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl bg-teal-400/15 py-4 text-sm font-bold text-teal-400">
                  <CheckCircle size={16} strokeWidth={2} />
                  저장 완료 — 내 경로로 돌아갑니다
                </div>
              ) : (
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => handleSave(false)}
                    disabled={!canSave}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-4 text-sm font-bold transition-colors ${
                      canSave ? 'bg-[#475569] text-white active:opacity-75' : 'bg-white/5 text-white/20 cursor-not-allowed'
                    }`}
                    whileTap={canSave ? { scale: 0.96 } : {}}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
                    <BookmarkPlus size={15} strokeWidth={2} />
                    내 경로 저장
                  </motion.button>
                  <motion.button
                    onClick={() => handleSave(true)}
                    disabled={!canSave}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-4 text-sm font-bold transition-colors ${
                      canSave ? 'bg-teal-400 text-slate-950 active:opacity-80' : 'bg-white/5 text-white/20 cursor-not-allowed'
                    }`}
                    whileTap={canSave ? { scale: 0.96 } : {}}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
                    <Users size={15} strokeWidth={2} />
                    커뮤니티 공유
                  </motion.button>
                </div>
              )}

              {!canSave && !done && (
                <p className="mt-2 text-center text-[10px] font-light text-white/20">
                  {points.length < 2 ? '경유지를 2개 이상 추가하세요' : '코스 이름을 입력하세요'}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
