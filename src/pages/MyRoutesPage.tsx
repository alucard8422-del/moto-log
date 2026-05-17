// MyRoutesPage.tsx — 내 경로 (사후 편집 모달 + 커뮤니티 공유 시트)
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BADGES, RIDE_DIARY_TIER_META, type Tier } from '../data/BadgesData'
import BadgeAchievementModal, { checkRideDiaryBadge } from '../components/BadgeAchievementModal'
import {
  Route, Clock, Flag, Trash2, Navigation,
  AlertTriangle, Image, Pencil, Share2, CheckCircle, X, MoreHorizontal, Plus,
} from 'lucide-react'
import {
  loadCourses, updateCourse, deleteCourse, shareToCommunity,
  type SavedCourse,
} from '../lib/courseStorage'

const KAKAO_APP_KEY = 'd2430786a3a92cc28ebf4f0a22993062'

declare global {
  interface Window { kakao: any }
}

// ── 포맷 ─────────────────────────────────────────────────────────────────
function fmtDist(km: number) { return km < 1 ? `${(km * 1000).toFixed(0)}m` : `${km.toFixed(0)}km` }
function fmtDur(m: number)   { return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분` }
function fmtDate(iso: string){ return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }) }

// ── 좌표→도시명 근사 매핑 ──────────────────────────────────────────────────
function approxCity(lat: number, lng: number): string {
  const MAP: [number, number, number, number, string][] = [
    [37.40,37.72,126.79,127.22,'서울'],[37.26,37.40,126.89,127.10,'수원'],
    [37.60,37.75,126.78,126.95,'고양'],[37.45,37.55,127.28,127.60,'양평'],
    [36.26,36.43,127.32,127.52,'대전'],[36.60,36.70,127.44,127.55,'청주'],
    [36.95,37.02,127.86,127.99,'충주'],[37.70,37.82,128.85,128.95,'강릉'],
    [37.85,37.97,128.74,128.95,'속초'],[36.77,36.88,127.09,127.21,'천안'],
    [36.45,36.60,127.10,127.25,'공주'],[36.47,36.55,127.38,127.45,'옥천'],
    [37.40,37.55,128.12,128.22,'횡성'],[37.40,37.55,127.85,128.00,'홍천'],
    [37.45,37.56,128.34,128.42,'평창'],[36.30,36.45,127.32,127.45,'세종'],
    [35.82,35.92,128.53,128.63,'대구'],[35.08,35.18,128.98,129.08,'부산'],
  ]
  for (const [a, b, c, d, name] of MAP) {
    if (lat >= a && lat <= b && lng >= c && lng <= d) return name
  }
  return '알 수 없음'
}

function cityLabel(pts: SavedCourse['gpxPoints']): string {
  if (pts.length < 2) return '경로 없음'
  const s = approxCity(pts[0].lat, pts[0].lng)
  const e = approxCity(pts[pts.length - 1].lat, pts[pts.length - 1].lng)
  return s === e ? s : `${s} → ${e}`
}

// ── 샘플 데이터 — 최초 1회 localStorage 시딩 전용 (이후 일반 코스와 동일 처리) ──
const MOCK_SEED_KEY = 'moto:mock-seeded'
const MOCK_COURSES: SavedCourse[] = [
  { id:'mock-1', title:'서울 → 강릉 동해안 투어', distanceKm:248, durationMin:195, isShared:false,
    createdAt: new Date(Date.now()-86400000*3).toISOString(), gpxXml:'',
    coverPhoto:'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=70',
    gpxPoints:[{lat:37.5665,lng:126.9780,timestamp:0},{lat:37.4890,lng:127.4920,timestamp:1},
      {lat:37.4210,lng:127.8870,timestamp:2},{lat:37.4920,lng:128.1570,timestamp:3},
      {lat:37.7520,lng:128.8760,timestamp:4},{lat:37.8813,lng:128.8980,timestamp:5}] },
  { id:'mock-2', title:'대전 → 서울 복귀 라이딩', distanceKm:163, durationMin:130, isShared:true,
    createdAt: new Date(Date.now()-86400000*10).toISOString(), gpxXml:'',
    coverPhoto:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=70',
    gpxPoints:[{lat:36.3504,lng:127.3845,timestamp:0},{lat:36.8065,lng:127.1520,timestamp:1},
      {lat:37.0630,lng:127.0590,timestamp:2},{lat:37.2636,lng:127.0286,timestamp:3},
      {lat:37.5665,lng:126.9780,timestamp:4}] },
  { id:'mock-3', title:'충주 → 대전 밤바리', distanceKm:112, durationMin:88, isShared:false,
    createdAt: new Date(Date.now()-86400000*2).toISOString(), gpxXml:'',
    coverPhoto:'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=70',
    gpxPoints:[{lat:36.9910,lng:127.9259,timestamp:0},{lat:36.8570,lng:127.6960,timestamp:1},
      {lat:36.6424,lng:127.4890,timestamp:2},{lat:36.4610,lng:127.4070,timestamp:3},
      {lat:36.3504,lng:127.3845,timestamp:4}] },
]

// ── 전국 누적 동선 지도 (카카오맵) ──────────────────────────────────────
function KoreaRouteMap({ courses }: { courses: SavedCourse[] }) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const mapRef         = useRef<any>(null)
  const polylinesRef   = useRef<any[]>([])
  const [mapReady, setMapReady] = useState(false)

  // 지도 초기화 (최초 1회)
  useEffect(() => {
    let cancelled = false

    const scriptId = 'kakao-map-script'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    const doInit = () => {
      if (cancelled || !containerRef.current) return
      window.kakao.maps.load(() => {
        if (cancelled || !containerRef.current) return
        const map = new window.kakao.maps.Map(containerRef.current, {
          center: new window.kakao.maps.LatLng(36.5, 127.8),
          level: 9,
        })
        map.setZoomable(false)
        map.setDraggable(false)
        mapRef.current = map
        setMapReady(true)
      })
    }

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

  // 경로 폴리라인 — 지도 준비 후 + courses 변경 시 재렌더
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.kakao?.maps) return

    polylinesRef.current.forEach(p => p.setMap(null))
    polylinesRef.current = []

    courses
      .filter(c => c.gpxPoints.length >= 2)
      .forEach(course => {
        const path = course.gpxPoints.map(p => new window.kakao.maps.LatLng(p.lat, p.lng))

        const glow = new window.kakao.maps.Polyline({
          path, strokeWeight: 10, strokeColor: '#2DD4BF', strokeOpacity: 0.12, strokeStyle: 'solid',
        })
        const main = new window.kakao.maps.Polyline({
          path, strokeWeight: 2.5, strokeColor: '#2DD4BF', strokeOpacity: 0.85, strokeStyle: 'solid',
        })
        glow.setMap(mapRef.current)
        main.setMap(mapRef.current)
        polylinesRef.current.push(glow, main)
      })
  }, [courses, mapReady])

  const lineCount = courses.filter(c => c.gpxPoints.length >= 2).length

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/5" style={{ height: 220 }}>
      {/* 카카오맵 컨테이너 */}
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0 }}
      />
      {/* 터치 차단 */}
      <div className="absolute inset-0 z-10 touch-none pointer-events-none" />
      {/* 하단 그라데이션 */}
      <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none z-20" />
      {/* 누적 동선 뱃지 */}
      <div className="absolute left-4 top-4 z-30 flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 backdrop-blur-md pointer-events-none">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
        <span className="text-[10px] font-light text-white/60">누적 동선</span>
      </div>
      {lineCount > 0 && (
        <div className="absolute bottom-4 right-4 z-30 rounded-full border border-teal-400/20 bg-slate-950/70 px-3 py-1.5 backdrop-blur-md pointer-events-none">
          <span className="text-[10px] font-bold text-teal-400">{lineCount}개 경로</span>
        </div>
      )}
    </div>
  )
}

// ── 삭제 컨펌 모달 ────────────────────────────────────────────────────────
function DeleteModal({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  const [open, setOpen] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOpen(true), 16); return () => clearTimeout(t) }, [])
  // 모달 열림 동안 배경 스크롤 차단
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  return (
    <>
      <div className={`fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100':'opacity-0 pointer-events-none'}`} onClick={onCancel} />
      <div className={`fixed inset-0 z-[80] flex items-center justify-center px-6 transition-all duration-300 ${open ? 'opacity-100 scale-100':'opacity-0 scale-95 pointer-events-none'}`}>
        <div className="w-full max-w-xs rounded-3xl border border-white/10 bg-[#161B26]/98 p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10">
            <AlertTriangle size={22} strokeWidth={1.5} className="text-rose-400" />
          </div>
          <p className="mb-1 text-sm font-bold text-white">주행 기록 삭제</p>
          <p className="mb-6 text-xs font-light text-white/40">'{title}' 기록을 삭제합니다. 복구할 수 없어요.</p>
          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-light text-white/50 active:opacity-60">취소</button>
            <button onClick={onConfirm} className="flex-1 rounded-2xl bg-rose-500/20 py-3 text-sm font-bold text-rose-400 ring-1 ring-rose-500/30 active:opacity-70">삭제</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── 커뮤니티 공유 컨펌 시트 ───────────────────────────────────────────────
function ShareSheet({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  const [open, setOpen] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOpen(true), 16); return () => clearTimeout(t) }, [])
  // 모달 열림 동안 배경 스크롤 차단
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  return (
    <>
      <div className={`fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100':'opacity-0 pointer-events-none'}`} onClick={onCancel} />
      <div className={`fixed bottom-0 inset-x-0 z-[80] transition-transform duration-500 ease-out ${open ? 'translate-y-0':'translate-y-full'}`}>
        <div className="mx-auto max-w-sm rounded-t-3xl border border-white/10 bg-[#161B26]/98 px-6 pt-5 pb-10 backdrop-blur-xl">
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-teal-400/10">
            <Share2 size={20} strokeWidth={1.5} className="text-teal-400" />
          </div>
          <p className="mb-1 mt-3 text-sm font-bold text-white">추천 코스로 공유하기</p>
          <p className="mb-6 text-xs font-light text-white/40">
            <span className="text-white/70">'{title}'</span> 코스를 커뮤니티에 공유하면<br />다른 라이더들의 추천 코스 탭에 등록돼요.
          </p>
          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-light text-white/50 active:opacity-60">아니오</button>
            <button onClick={onConfirm} className="flex-1 rounded-2xl bg-teal-400 py-3.5 text-sm font-bold text-slate-950 active:opacity-80">예, 공유하기</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── 사후 편집 모달 (사진 슬라이더 + 액션 시트 + 후기 작성) ────────────────
function EditModal({ course, onSave, onClose }: {
  course: SavedCourse
  onSave: (id: string, diary: string, photos: string[]) => void
  onClose: () => void
}) {
  const [open, setOpen]               = useState(false)
  const [diary, setDiary]             = useState(course.diary ?? '')
  // photos: 다중 사진 배열 (coverPhoto를 초기값으로)
  const [photos, setPhotos]           = useState<string[]>(course.coverPhoto ? [course.coverPhoto] : [])
  const [currentIdx, setCurrentIdx]   = useState(0)
  const [showActionSheet, setShowActionSheet] = useState(false)
  const fileRef  = useRef<HTMLInputElement>(null)
  const touchX   = useRef(0)

  useEffect(() => { const t = setTimeout(() => setOpen(true), 16); return () => clearTimeout(t) }, [])
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhotos(prev => [...prev, reader.result as string])
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const deleteCurrentPhoto = () => {
    const next = photos.filter((_, i) => i !== currentIdx)
    setPhotos(next)
    setCurrentIdx(Math.max(0, Math.min(currentIdx, next.length - 1)))
    setShowActionSheet(false)
  }

  return (
    <>
      <div className={`fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100':'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed bottom-0 inset-x-0 z-[80] transition-transform duration-500 ease-out ${open ? 'translate-y-0':'translate-y-full'}`}>
        <div className="mx-auto max-w-sm rounded-t-3xl border border-white/10 bg-[#161B26]/98 px-5 pt-5 pb-10 backdrop-blur-xl">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

          {/* 헤더 */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-light text-white/30">기록 편집</p>
              <p className="text-sm font-bold text-white">{cityLabel(course.gpxPoints)}</p>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40 active:opacity-60">
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>

          {/* 사진 슬라이더 or 첨부 버튼 */}
          {photos.length > 0 ? (
            <div
              className="relative mb-3 h-36 overflow-hidden rounded-2xl"
              onTouchStart={e => { touchX.current = e.touches[0].clientX }}
              onTouchEnd={e => {
                const dx = e.changedTouches[0].clientX - touchX.current
                if (Math.abs(dx) < 40) return
                if (dx < 0 && currentIdx < photos.length - 1) setCurrentIdx(i => i + 1)
                if (dx > 0 && currentIdx > 0) setCurrentIdx(i => i - 1)
              }}
            >
              {/* 슬라이드 스트립 */}
              <div
                className="flex h-full transition-transform duration-300 ease-out"
                style={{
                  width: `${photos.length * 100}%`,
                  transform: `translateX(-${(currentIdx * 100) / photos.length}%)`,
                }}
              >
                {photos.map((url, i) => (
                  <div key={i} style={{ width: `${100 / photos.length}%` }} className="h-full shrink-0">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>

              {/* 우상단 ... 삼점 메뉴 */}
              <button
                onClick={() => setShowActionSheet(true)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/70 backdrop-blur-sm active:opacity-60"
              >
                <MoreHorizontal size={14} strokeWidth={2} />
              </button>

              {/* Dot 인디케이터 — 2장 이상일 때만 */}
              {photos.length > 1 && (
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {photos.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === currentIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] py-4 text-xs font-light text-white/30 active:opacity-60"
            >
              <Image size={13} strokeWidth={1.5} />대표 사진 첨부하기
            </button>
          )}

          {/* 후기 */}
          <textarea value={diary} onChange={e => setDiary(e.target.value)}
            placeholder="오늘 주행 후기를 남겨보세요 🏍️" rows={3} maxLength={200}
            className="mb-1 w-full resize-none rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-3 text-sm font-light text-white outline-none placeholder:text-white/20 focus:border-teal-400/30 transition-colors" />
          <p className="mb-4 text-right text-[10px] font-light text-white/20">{diary.length}/200</p>

          {/* 저장 */}
          <button onClick={() => onSave(course.id, diary, photos)}
            className="flex w-full items-center justify-center gap-2 rounded-3xl bg-teal-400 py-4 text-sm font-bold text-slate-950 active:opacity-80">
            <CheckCircle size={15} strokeWidth={2} />저장하기
          </button>
        </div>
      </div>

      {/* 파일 input */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* 액션 시트 — ... 버튼 */}
      {showActionSheet && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/50" onClick={() => setShowActionSheet(false)} />
          <div className="fixed bottom-0 inset-x-0 z-[100]">
            <div className="mx-auto max-w-sm rounded-t-3xl border border-white/10 bg-[#161B26]/98 px-4 pt-4 pb-10 backdrop-blur-xl">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
              <button
                onClick={() => { setShowActionSheet(false); fileRef.current?.click() }}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-light text-white/70 active:bg-white/5"
              >
                <Image size={16} strokeWidth={1.5} className="text-teal-400" />
                사진 추가하기
              </button>
              <button
                onClick={deleteCurrentPhoto}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-light text-rose-400 active:bg-white/5"
              >
                <Trash2 size={16} strokeWidth={1.5} />
                현재 사진 삭제하기
              </button>
              <div className="my-2 h-px bg-white/5" />
              <button
                onClick={() => setShowActionSheet(false)}
                className="flex w-full items-center justify-center rounded-2xl px-4 py-3.5 text-sm font-light text-white/30 active:bg-white/5"
              >
                취소
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ── 주행 기록 카드 ────────────────────────────────────────────────────────
interface RouteCardProps {
  course: SavedCourse
  onDelete: (id: string) => void
  onEdit: (course: SavedCourse) => void
  onShare: (course: SavedCourse) => void
}

function RouteCard({ course, onDelete, onEdit, onShare }: RouteCardProps) {
  const label = cityLabel(course.gpxPoints)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <>
      {/*
       * 카드 전체(이미지 포함)를 누르면 편집 모달 진입.
       * 우상단 액션 버튼은 e.stopPropagation()으로 버블링 차단.
       */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onEdit(course)}
        className="relative h-48 w-full overflow-hidden rounded-3xl border border-white/5 cursor-pointer active:opacity-90 transition-opacity"
      >
        {/* 배경 사진 */}
        {course.coverPhoto
          ? <img src={course.coverPhoto} className="absolute inset-0 h-full w-full object-cover" alt="" />
          : <div className="absolute inset-0 bg-[#0b1120]" style={{ backgroundImage:`linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)`, backgroundSize:'20px 20px' }} />
        }

        {/* 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* 우상단 버튼 그룹 — stopPropagation으로 카드 클릭과 분리 */}
        <div className="absolute right-3 top-3 flex gap-1.5 z-10">
          {/* 편집 아이콘 (시각 힌트 유지) */}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(course) }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/50 backdrop-blur-md active:bg-teal-400/20 active:text-teal-400"
          >
            <Pencil size={12} strokeWidth={1.5} />
          </button>
          {/* 공유 — 미공유: Share2 활성 / 공유완료: CheckCircle 민트 disabled */}
          <button
            onClick={(e) => { e.stopPropagation(); if (!course.communityShared) onShare(course) }}
            disabled={!!course.communityShared}
            className={`flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition-colors duration-300 ${
              course.communityShared
                ? 'border-teal-400/30 bg-teal-400/10 text-teal-400'
                : 'border-white/10 bg-black/40 text-white/50 active:bg-teal-400/20 active:text-teal-400'
            }`}
          >
            {course.communityShared
              ? <CheckCircle size={12} strokeWidth={2}   />
              : <Share2      size={12} strokeWidth={1.5} />
            }
          </button>
          {/* 삭제 */}
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/50 backdrop-blur-md active:bg-rose-500/20 active:text-rose-400"
          >
            <Trash2 size={12} strokeWidth={1.5} />
          </button>
        </div>

        {/* 공유됨 뱃지 */}
        {course.communityShared && (
          <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-teal-400/15 px-2.5 py-1 border border-teal-400/20">
            <CheckCircle size={9} strokeWidth={1.5} className="text-teal-400" />
            <span className="text-[9px] font-bold text-teal-400">커뮤니티 공유됨</span>
          </div>
        )}

        {/* 하단 정보 */}
        <div className="absolute bottom-0 inset-x-0 p-4">
          <p className="flex items-center gap-1.5 text-base font-bold text-white drop-shadow-md">
            <Navigation size={13} strokeWidth={1.5} className="text-teal-400 shrink-0" />
            {label}
          </p>
          {/* 후기 미리보기 */}
          {course.diary && (
            <p className="mt-0.5 text-[11px] font-light text-white/55 line-clamp-1">{course.diary}</p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] font-light text-white/50">
            <span className="flex items-center gap-1"><Route size={10} strokeWidth={1.5} />{fmtDist(course.distanceKm)}</span>
            <span className="flex items-center gap-1"><Clock size={10} strokeWidth={1.5} />{fmtDur(course.durationMin)}</span>
            <span className="text-white/30">{fmtDate(course.createdAt)}</span>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <DeleteModal
          title={label}
          onConfirm={() => { onDelete(course.id); setConfirmDelete(false) }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}

// ── 빈 상태 ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 px-8 pt-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
        <Flag size={32} strokeWidth={1.5} className="text-white/15" />
      </div>
      <p className="text-sm font-bold text-white/40">아직 기록된 경로가 없어요</p>
      <p className="text-xs font-light text-white/20">지도 탭에서 주행을 마치면<br />여기에 경로가 저장돼요.</p>
    </div>
  )
}

// ── 경로 작성 FAB (토글 + 레이블 슬라이드) ─────────────────────────────────
function RouteFab({ onNavigate }: { onNavigate: () => void }) {
  const [open, setOpen] = useState(false)

  // FAB 클릭: open → 닫기만 / closed → 열기만
  // 실제 라우팅은 오직 레이블 칩 터치로만 발생
  const handleFabClick = () => {
    setOpen(prev => !prev)
  }

  // 외부 클릭 시 닫기 (배경 터치)
  const handleBackdropClick = () => setOpen(false)

  return (
    <>
      {/* 배경 딤 — 열린 상태에서만 노출, 터치 시 닫기 */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="fab-backdrop"
            className="fixed inset-0 z-[48]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={handleBackdropClick}
          />
        )}
      </AnimatePresence>

      {/* FAB 영역 */}
      <div className="fixed bottom-28 right-5 z-[49] flex items-center gap-3">

        {/* 레이블 칩 — 왼쪽에서 슬라이딩 등장 */}
        <AnimatePresence>
          {open && (
            <motion.button
              key="fab-label"
              onClick={onNavigate}
              className="flex items-center gap-1.5 rounded-full border border-teal-400/30 bg-slate-950/90 px-4 py-2.5 shadow-lg shadow-black/40 backdrop-blur-md"
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            >
              {/* 점멸 인디케이터 */}
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-400" />
              <span className="whitespace-nowrap text-sm font-bold text-teal-400">
                경로 작성
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* + / × 회전 FAB 버튼 */}
        <motion.button
          onClick={handleFabClick}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-400 shadow-xl shadow-teal-900/50"
          aria-label={open ? '메뉴 닫기' : '경로 직접 그리기'}
          whileTap={{ scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {/* + 아이콘 — open 시 45도 회전하여 × 형태로 변환 */}
          <motion.span
            className="flex items-center justify-center"
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            <Plus size={24} strokeWidth={2.5} className="text-slate-950" />
          </motion.span>
        </motion.button>
      </div>
    </>
  )
}

// ── 메인 ─────────────────────────────────────────────────────────────────
export default function MyRoutesPage() {
  const navigate                       = useNavigate()
  const [courses, setCourses]         = useState<SavedCourse[]>([])
  const [editTarget, setEditTarget]   = useState<SavedCourse | null>(null)
  const [shareTarget, setShareTarget] = useState<SavedCourse | null>(null)
  const [toast, setToast]             = useState('')
  // 배지 달성 팝업 큐 (연쇄 달성 순차 노출)
  const [badgeQueue, setBadgeQueue]   = useState<Array<{ badgeId: string; tier: Tier }>>([])
  const currentBadge                  = badgeQueue[0] ?? null
  const dismissBadge                  = () => setBadgeQueue(prev => prev.slice(1))

  // 토스트 3초 후 자동 소멸
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const stored = loadCourses()

    if (!localStorage.getItem(MOCK_SEED_KEY)) {
      // 최초 1회: 샘플 데이터를 localStorage에 실제 코스로 시딩
      // 이후 삭제·수정·공유 등 모든 CRUD가 일반 코스와 동일하게 작동
      const seeded = [...MOCK_COURSES, ...stored]
      localStorage.setItem('moto_my_courses', JSON.stringify(seeded))
      localStorage.setItem(MOCK_SEED_KEY, '1')
      setCourses(seeded)
    } else {
      // 2회차 이후: localStorage만 신뢰 — 삭제 결과가 영속됨
      setCourses(stored)
    }
  }, [])

  const handleDelete = (id: string) => {
    deleteCourse(id)                                   // mock 포함 모두 localStorage에서 제거
    setCourses(prev => prev.filter(c => c.id !== id))
  }

  const handleSave = (id: string, diary: string, photos: string[]) => {
    const partial: Partial<SavedCourse> = { diary }
    if (photos.length > 0) partial.coverPhoto = photos[0]
    updateCourse(id, partial)
    setCourses(prev => prev.map(c => c.id === id ? { ...c, ...partial } : c))
    setEditTarget(null)
    setToast('기록이 저장되었습니다')

    // 주행 기록 누적 배지 체크 → 달성 시 꽃가루 팝업 트리거
    const { newlyUnlocked } = checkRideDiaryBadge()
    if (newlyUnlocked.length > 0) setBadgeQueue(newlyUnlocked)
  }

  const handleShareConfirm = (id: string) => {
    shareToCommunity(id)
    setCourses(prev => prev.map(c => c.id === id ? { ...c, communityShared: true, isShared: true } : c))
    setShareTarget(null)
    // 전역 이벤트 → TourPage 공유 광장 즉시 갱신
    window.dispatchEvent(new CustomEvent('moto:community-updated'))
    setToast('공유되었습니다')
  }

  return (
    <div className="flex flex-col gap-5 px-4 pt-5 pb-32">
      <div>
        <p className="text-xs font-light text-white/30">GPS 기록 보관함</p>
        <h2 className="text-xl font-bold text-white">내 경로</h2>
      </div>

      <KoreaRouteMap courses={courses} />

      {/* 요약 통계 */}
      {courses.length > 0 && (
        <div className="flex gap-3 rounded-3xl border border-white/5 bg-white/[0.03] px-5 py-4">
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-teal-400">{courses.length}</p>
            <p className="text-[10px] font-light text-white/30">총 기록</p>
          </div>
          <div className="w-px bg-white/5" />
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-teal-400">{courses.reduce((s, c) => s + c.distanceKm, 0).toFixed(0)}</p>
            <p className="text-[10px] font-light text-white/30">총 km</p>
          </div>
          <div className="w-px bg-white/5" />
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-teal-400">{Math.round(courses.reduce((s, c) => s + c.durationMin, 0) / 60)}</p>
            <p className="text-[10px] font-light text-white/30">총 시간(h)</p>
          </div>
        </div>
      )}

      {/* 카드 목록 */}
      {courses.length === 0 ? <EmptyState /> : (
        <div className="flex flex-col gap-3">
          {courses.map(c => (
            <RouteCard key={c.id} course={c}
              onDelete={handleDelete}
              onEdit={setEditTarget}
              onShare={setShareTarget}
            />
          ))}
        </div>
      )}

      {/* ── 공유 완료 토스트 ── */}
      <div
        className={`pointer-events-none fixed bottom-28 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-2 rounded-full bg-teal-400 px-5 py-3 shadow-xl shadow-teal-900/40 transition-all duration-300 ${
          toast ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        <CheckCircle size={15} strokeWidth={2} className="text-slate-950" />
        <span className="text-sm font-bold text-slate-950">{toast}</span>
      </div>

      {/* 편집 모달 */}
      {editTarget && (
        <EditModal course={editTarget} onSave={handleSave} onClose={() => setEditTarget(null)} />
      )}

      {/* 커뮤니티 공유 컨펌 */}
      {shareTarget && (
        <ShareSheet
          title={cityLabel(shareTarget.gpxPoints)}
          onConfirm={() => handleShareConfirm(shareTarget.id)}
          onCancel={() => setShareTarget(null)}
        />
      )}

      {/* 주행 기록 배지 달성 팝업 (티어별 이름·아이콘 오버라이드) */}
      {currentBadge && (() => {
        const base = BADGES.find(b => b.id === currentBadge.badgeId)
        if (!base) return null
        const meta = RIDE_DIARY_TIER_META[currentBadge.tier]
        // BadgeDef의 name/description/icon을 티어에 맞게 오버라이드
        const overridden = { ...base, name: meta.name, description: meta.description, icon: meta.icon }
        return (
          <BadgeAchievementModal
            badge={overridden}
            tier={currentBadge.tier}
            isOpen={true}
            onClose={dismissBadge}
          />
        )
      })()}

      {/* ── 경로 작성 FAB (토글 → 레이블 등장 → 이동) ── */}
      <RouteFab onNavigate={() => navigate('/route-planner')} />
    </div>
  )
}
