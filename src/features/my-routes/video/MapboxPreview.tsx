// MapboxPreview.tsx — GPX 경로 미리보기 전용 맵 (녹화 없음)
// map.setStyle() 로 스타일만 교체 → 재생 위치·경로·속도 그대로 유지

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import * as THREE from 'three'
import type { ViewOption } from './videoTypes'
import type { GpxPoint } from '../../../constants/sampleGpxData'
import { getCurrentBikeColor } from '../../../lib/bikeUtils'
import type { MemoryPin } from './pins/pinTypes'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string

// ── 기준 재생 배율 ────────────────────────────────────────────────────────────
// 15 = speed=1 일 때 실제 라이딩 시간의 15배속
const BASE_PREVIEW_RATE = 15

const BRG_LERP    = 0.05   // 방위각 LERP — 낮을수록 부드러운 추적 (60fps 기준 ~1.5s lag)
const SPLINE_SEGS = 20     // 세그먼트당 보간 포인트 수
const SMOOTH_R    = 40     // 방위각 가우시안 스무딩 반경 (클수록 커브가 부드럽게 사전 처리됨)
const TGT_SMOOTH  = 0.06   // 이중 EMA 1단계: targetBrg 자체를 먼저 스무딩

// ── 수학 헬퍼 ────────────────────────────────────────────────────────────────

function lerpBearing(a: number, b: number, t: number): number {
  let d = b - a
  while (d >  180) d -= 360
  while (d < -180) d += 360
  return a + d * t
}

function calcBearing(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R    = Math.PI / 180
  const dLng = (lng2 - lng1) * R
  const la1  = lat1 * R, la2 = lat2 * R
  const y = Math.sin(dLng) * Math.cos(la2)
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360
}

function distM(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R    = 6_371_000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    = Math.sin(dLat/2)**2
            + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t, t3 = t2 * t
  return 0.5 * (
    2*p1 + (-p0 + p2)*t + (2*p0 - 5*p1 + 4*p2 - p3)*t2 + (-p0 + 3*p1 - 3*p2 + p3)*t3
  )
}

// 방위각 배열에 가우시안 스무딩 적용 → 급격한 방향 전환을 부드럽게
function smoothBearings(brgs: number[], radius: number): number[] {
  return brgs.map((_, i) => {
    let bx = 0, by = 0, wSum = 0
    for (let k = -radius; k <= radius; k++) {
      const j  = Math.max(0, Math.min(brgs.length - 1, i + k))
      const wk = Math.exp(-0.5 * (k / (radius * 0.5)) ** 2)
      const r  = brgs[j] * Math.PI / 180
      bx += Math.cos(r) * wk
      by += Math.sin(r) * wk
      wSum += wk
    }
    return ((Math.atan2(by / wSum, bx / wSum) * 180 / Math.PI) + 360) % 360
  })
}

type Pt = { lat: number; lng: number; timestamp: number }

function splinePoints(pts: Pt[]): Pt[] {
  if (pts.length < 2) return pts
  const result: Pt[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let s = 0; s < SPLINE_SEGS; s++) {
      const t = s / SPLINE_SEGS
      result.push({
        lng:       catmullRom(p0.lng, p1.lng, p2.lng, p3.lng, t),
        lat:       catmullRom(p0.lat, p1.lat, p2.lat, p3.lat, t),
        timestamp: p1.timestamp + (p2.timestamp - p1.timestamp) * t,
      })
    }
  }
  result.push(pts[pts.length - 1])
  return result
}

function buildSampler(rawPts: Pt[]) {
  const pts       = splinePoints(rawPts)
  const t0        = pts[0].timestamp
  const tN        = pts[pts.length - 1].timestamp
  const journeyMs = Math.max(tN - t0, 1)

  const rawBearings = pts.slice(0, -1).map((p, i) =>
    calcBearing(p.lng, p.lat, pts[i + 1].lng, pts[i + 1].lat)
  )
  const segBearings = smoothBearings(rawBearings, SMOOTH_R)

  function posAt(progress: number): [number, number] {
    const rideTime = t0 + Math.max(0, Math.min(1, progress)) * journeyMs
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].timestamp >= rideTime) {
        const segDt = pts[i].timestamp - pts[i - 1].timestamp
        const segT  = segDt > 0 ? (rideTime - pts[i - 1].timestamp) / segDt : 0
        return [
          pts[i - 1].lng + (pts[i].lng - pts[i - 1].lng) * segT,
          pts[i - 1].lat + (pts[i].lat - pts[i - 1].lat) * segT,
        ]
      }
    }
    return [pts[pts.length - 1].lng, pts[pts.length - 1].lat]
  }

  function bearingAt(progress: number): number {
    const rideTime = t0 + Math.max(0, Math.min(0.9999, progress)) * journeyMs
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].timestamp >= rideTime) {
        const cur   = segBearings[i - 1]
        const next  = segBearings[Math.min(segBearings.length - 1, i)]
        const segDt = pts[i].timestamp - pts[i - 1].timestamp
        const segT  = segDt > 0 ? (rideTime - pts[i - 1].timestamp) / segDt : 0
        return lerpBearing(cur, next, segT)
      }
    }
    return segBearings[segBearings.length - 1] ?? 0
  }

  function speedAt(progress: number): number {
    const rideTime = t0 + Math.max(0, Math.min(0.9999, progress)) * journeyMs
    let centerIdx = 1
    for (let i = 1; i < rawPts.length; i++) {
      if (rawPts[i].timestamp >= rideTime) { centerIdx = i; break }
    }
    const WINDOW = 3
    const start  = Math.max(1, centerIdx - WINDOW)
    const end    = Math.min(rawPts.length - 1, centerIdx + WINDOW)
    let totalM = 0, totalMs = 0
    for (let i = start; i <= end; i++) {
      const dt = rawPts[i].timestamp - rawPts[i - 1].timestamp
      if (dt <= 0) continue
      const m = distM(rawPts[i - 1].lng, rawPts[i - 1].lat, rawPts[i].lng, rawPts[i].lat)
      if (m < 0.1) continue
      totalM  += m
      totalMs += dt
    }
    if (totalMs <= 0) return 0
    return (totalM / totalMs) * 3600
  }

  function trailAt(progress: number): [number, number][] {
    const rideTime = t0 + Math.max(0, Math.min(1, progress)) * journeyMs
    const coords: [number, number][] = []
    for (const p of pts) {
      if (p.timestamp <= rideTime) coords.push([p.lng, p.lat])
      else break
    }
    const cur  = posAt(progress)
    const last = coords[coords.length - 1]
    if (!last || last[0] !== cur[0] || last[1] !== cur[1]) coords.push(cur)
    if (coords.length < 2) coords.push([...coords[0]])
    return coords
  }

  return { posAt, bearingAt, speedAt, trailAt, journeyMs }
}

// ── Three.js 바이크 3D 씬 생성 ────────────────────────────────────────────────
// 차고(GarageBike.tsx)와 동일한 지오메트리 — raw Three.js (React Three Fiber 없음)

function createBike3DScene(color: string): { scene: THREE.Scene; camera: THREE.Camera } {
  const scene  = new THREE.Scene()
  const camera = new THREE.Camera()

  // 조명
  scene.add(new THREE.AmbientLight(0xffffff, 0.9))
  const dir = new THREE.DirectionalLight(0xffffff, 1.8)
  dir.position.set(0.5, 2, 1)
  scene.add(dir)

  // 재질
  const bodyMat   = new THREE.MeshStandardMaterial({ color,      metalness: 0.5, roughness: 0.3 })
  const darkMat   = new THREE.MeshStandardMaterial({ color: '#111827', metalness: 0.7, roughness: 0.3 })
  const metalMat  = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.9, roughness: 0.1 })
  const grayMat   = new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.9, roughness: 0.1 })
  const seatMat   = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.95 })
  const mufMat    = new THREE.MeshStandardMaterial({ color: '#64748B', metalness: 0.85, roughness: 0.15 })
  const hlMat     = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.4, toneMapped: false })

  // 그룹: 앞면이 +X이므로 Y축 -90° 회전 → 앞면을 +Z 방향으로 (Mapbox bearing 회전과 맞춤)
  const group = new THREE.Group()
  group.rotation.y = -Math.PI / 2

  function add(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    m.rotation.set(rx, ry, rz)
    group.add(m)
  }

  // 뒷바퀴 + 휠
  add(new THREE.TorusGeometry(0.36, 0.09, 16, 40),        darkMat,  -0.75, 0.36, 0, Math.PI / 2)
  add(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 16),   metalMat, -0.75, 0.36, 0, 0, 0, Math.PI / 2)
  // 앞바퀴 + 휠
  add(new THREE.TorusGeometry(0.36, 0.09, 16, 40),        darkMat,   0.78, 0.36, 0, Math.PI / 2)
  add(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 16),   metalMat,  0.78, 0.36, 0, 0, 0, Math.PI / 2)
  // 메인 프레임
  add(new THREE.BoxGeometry(1.3, 0.28, 0.32),              bodyMat,   0,    0.68, 0)
  // 연료 탱크
  add(new THREE.BoxGeometry(0.55, 0.22, 0.3),              bodyMat,   0.1,  0.88, 0)
  // 시트
  add(new THREE.BoxGeometry(0.55, 0.1, 0.26),              seatMat,  -0.3,  0.9,  0)
  // 엔진
  add(new THREE.BoxGeometry(0.38, 0.32, 0.34),             metalMat,  0.05, 0.48, 0)
  // 앞 포크
  add(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8),  grayMat,   0.72, 0.62, 0, 0, 0, 0.15)
  // 핸들바
  add(new THREE.BoxGeometry(0.08, 0.06, 0.6),              grayMat,   0.6,  0.98, 0)
  // 머플러
  add(new THREE.CylinderGeometry(0.04, 0.055, 0.7, 12),   mufMat,   -0.3,  0.28, 0.2, 0, -0.1, Math.PI / 2)
  // 헤드라이트
  add(new THREE.SphereGeometry(0.09, 12, 12),              hlMat,     0.88, 0.8,  0)

  scene.add(group)
  return { scene, camera }
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

interface Props {
  points:       GpxPoint[] | Array<{ lat: number; lng: number; timestamp: number }>
  view:         ViewOption
  speed:        number
  isPaused:     boolean
  mapStyle?:    string   // Mapbox 스타일 URL (기본: satellite-streets-v12)
  onProgress:   (pct: number) => void
  onSpeed?:     (kmh: number) => void
  onEnd?:       () => void
  onSeekReady?: (seekFn: (fraction: number) => void) => void  // progress bar 탐색용
  // ── 추억 핀 ──────────────────────────────────────────────────────────────────
  pins?:                MemoryPin[]
  onCoordLookupReady?:  (fn: (clientX: number, clientY: number) => { lat: number; lng: number } | null) => void
  onPosition?:          (lat: number, lng: number) => void
  onPinTapCheckReady?:   (fn: (clientX: number, clientY: number) => MemoryPin | null) => void
  // ── 정지 중 수동 카메라 회전 ───────────────────────────────────────────────
  onManualRotateReady?: (fn: (deltaBrg: number) => void) => void
  // ── 시점 버튼 → 커스텀 초기화 ─────────────────────────────────────────────
  onViewResetReady?:   (fn: () => void) => void
}

const DEFAULT_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12'

export default function MapboxPreview({ points, view, speed, isPaused, mapStyle = DEFAULT_STYLE, onProgress, onSpeed, onEnd, onSeekReady, pins, onCoordLookupReady, onPosition, onPinTapCheckReady, onManualRotateReady, onViewResetReady }: Props) {
  const containerRef     = useRef<HTMLDivElement>(null)
  const mapRef           = useRef<mapboxgl.Map | null>(null)
  const rafRef           = useRef(0)
  const activeRef        = useRef(false)
  // 3D 바이크 레이어가 읽는 현재 위치·방위각
  const bikeTransformRef = useRef<{ lng: number; lat: number; bearing: number }>({ lng: 0, lat: 0, bearing: 0 })

  const speedRef    = useRef(speed)
  const viewRef     = useRef(view)
  const isPausedRef = useRef(isPaused)

  useEffect(() => { speedRef.current    = speed    }, [speed])
  useEffect(() => { viewRef.current     = view     }, [view])
  useEffect(() => { isPausedRef.current = isPaused }, [isPaused])

  // ── 추억 핀 마커 ─────────────────────────────────────────────────────────────
  const markersRef    = useRef<mapboxgl.Marker[]>([])
  const pinsRef       = useRef<MemoryPin[]>(pins ?? [])
  const mapReadyRef   = useRef(false)
  const onPositionRef = useRef(onPosition)
  useEffect(() => { pinsRef.current    = pins ?? []    }, [pins])
  useEffect(() => { onPositionRef.current = onPosition }, [onPosition])

  function rebuildPinMarkers() {
    const map = mapRef.current
    if (!map || !mapReadyRef.current) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = (pinsRef.current).map(pin => {
      const el = document.createElement('div')
      el.style.pointerEvents = 'none'

      if (pin.photo) {
        // ── 사진 핀: 원형 썸네일 + 하단 삼각 포인터 ─────────────────────
        Object.assign(el.style, {
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          width:          '42px',
          height:         '54px',
        })
        const thumb = document.createElement('div')
        Object.assign(thumb.style, {
          width:           '40px',
          height:          '40px',
          borderRadius:    '50%',
          border:          '2.5px solid #fff',
          boxShadow:       '0 3px 12px rgba(0,0,0,0.5)',
          backgroundImage: `url('${pin.photo}')`,
          backgroundSize:     'cover',
          backgroundPosition: 'center',
          backgroundRepeat:   'no-repeat',
          flexShrink:      '0',
        })
        const tip = document.createElement('div')
        Object.assign(tip.style, {
          width:         '0',
          height:        '0',
          borderLeft:    '7px solid transparent',
          borderRight:   '7px solid transparent',
          borderTop:     '11px solid #fff',
          marginTop:     '-2px',
          filter:        'drop-shadow(0 2px 3px rgba(0,0,0,0.25))',
        })
        el.appendChild(thumb)
        el.appendChild(tip)
      } else {
        // ── 기본 핀: 순수 CSS (SVG 미사용 → 모바일 색상 확실) ─────────────
        // 흰 원형 헤드 + 틸 내부 도트 + 흰 삼각 꼬리
        el.style.cssText =
          'pointer-events:none;display:flex;flex-direction:column;align-items:center;width:22px;height:34px'

        const head = document.createElement('div')
        head.style.cssText =
          'width:22px;height:22px;border-radius:50%;background:#ffffff;' +
          'box-shadow:0 2px 8px rgba(0,0,0,0.5);' +
          'display:flex;align-items:center;justify-content:center;flex-shrink:0'

        const dot = document.createElement('div')
        dot.style.cssText =
          'width:8px;height:8px;border-radius:50%;background:#2dd4bf'

        const tail = document.createElement('div')
        tail.style.cssText =
          'width:0;height:0;' +
          'border-left:5px solid transparent;border-right:5px solid transparent;' +
          'border-top:12px solid #ffffff;margin-top:-1px;' +
          'filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3))'

        head.appendChild(dot)
        el.appendChild(head)
        el.appendChild(tail)
      }

      return new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map)
    })
  }

  // pins 배열이 바뀔 때마다 마커 재동기화
  useEffect(() => {
    pinsRef.current = pins ?? []
    rebuildPinMarkers()
  }, [pins]) // eslint-disable-line

  // ── 스타일 변경 시 레이어를 재등록하는 함수 (ref 로 공유) ────────────────────
  // addLayersRef: (isDark: boolean) => Promise<void>
  // accRideMsRef: 스타일 교체 후 경로/바이크 위치를 즉시 복원하기 위한 진행 시간
  const addLayersRef = useRef<((isDark: boolean) => Promise<void>) | null>(null)
  const accRideMsRef = useRef(0)

  // ── 맵 초기화 (최초 1회) ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const pts    = points as Pt[]
    const first  = pts[0]
    const initBrg = calcBearing(
      pts[0].lng, pts[0].lat,
      pts[1]?.lng ?? pts[0].lng,
      pts[1]?.lat ?? pts[0].lat,
    )

    // ── 커스텀 줌 (window 에 달아야 오버레이 div 위에서도 동작) ───────────────
    let currentZoom    = view.zoom
    let viewZoomTarget = view.zoom
    const ZOOM_MIN     = 8
    const ZOOM_MAX     = 22   // Mapbox GL 최대 지원 줌 (22 = 벡터 타일 한계)

    const onWheel = (e: WheelEvent) => {
      const factor = e.deltaMode === 1 ? 30 : e.deltaMode === 2 ? 300 : 1
      const delta  = -(e.deltaY * factor) / 500
      currentZoom    = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, currentZoom + delta))
      viewZoomTarget = currentZoom
    }
    window.addEventListener('wheel', onWheel, { passive: true })

    let pinchPrevDist = 0
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchPrevDist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY,
        )
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length < 2) return
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY,
      )
      if (pinchPrevDist > 0) {
        currentZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX,
          currentZoom + Math.log2(dist / pinchPrevDist)
        ))
        viewZoomTarget = currentZoom
      }
      pinchPrevDist = dist
    }
    const onTouchEnd = () => { pinchPrevDist = 0 }
    window.addEventListener('touchstart',  onTouchStart, { passive: true })
    window.addEventListener('touchmove',   onTouchMove,  { passive: true })
    window.addEventListener('touchend',    onTouchEnd,   { passive: true })
    window.addEventListener('touchcancel', onTouchEnd,   { passive: true })

    // ── 맵 생성 ──────────────────────────────────────────────────────────────
    const map = new mapboxgl.Map({
      container:   containerRef.current,
      style:       mapStyle,
      center:      [first.lng, first.lat],
      zoom:        view.zoom,
      pitch:       view.pitch,
      bearing:     initBrg,
      antialias:   true,
      interactive: false,
    })
    mapRef.current = map

    map.on('load', async () => {
      const coords  = pts.map(p => [p.lng, p.lat]) as [number, number][]
      const sampler = buildSampler(pts)

      // ── 레이어 등록 함수 (초기 + setStyle 후 재호출용) ──────────────────────
      // 스타일 교체 시 Mapbox가 모든 소스/레이어를 제거하므로 전부 새로 추가해야 함
      async function addLayers(isDark: boolean) {
        // 3D 지형 — exaggeration 2.5 → 고도차가 있는 지역에서 산·언덕이 확실히 솟음
        map.addSource('mapbox-dem', {
          type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512, maxzoom: 14,
        })
        try { map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.0 }) } catch {}

        // 안개 완전 제거 — 스타일 내장 안개도 초기화
        try {
          ;(map as unknown as { setFog: (v: null) => void }).setFog(null)
        } catch {}

        // 하늘·대기 효과 — 수평선 깊이감 부여 (안개와 다름: 지상 가시거리 영향 없음)
        try {
          map.addLayer({
            id: 'sky',
            type: 'sky',
            paint: {
              'sky-type':                       'atmosphere',
              'sky-atmosphere-sun':             [0.0, 45.0],
              'sky-atmosphere-sun-intensity':   5,
              'sky-atmosphere-color':           'rgba(160, 210, 255, 1)',
              'sky-atmosphere-halo-color':      'rgba(255, 255, 255, 0.4)',
              'sky-atmosphere-space-color':     'rgba(100, 150, 220, 1)',
            },
          } as mapboxgl.AnyLayer)
        } catch {}

        // 음영지형 (hillshade) — 위성사진 위에 DEM 기반 빛/그림자를 반투명으로 덧씌움
        // 평야처럼 고도차가 적은 지역에서도 미세한 기복이 시각적으로 드러남
        try {
          map.addLayer({
            id: 'terrain-hillshade',
            type: 'hillshade',
            source: 'mapbox-dem',
            paint: {
              'hillshade-shadow-color':          '#3b3520',
              'hillshade-highlight-color':       '#ffffff',
              'hillshade-illumination-direction': 335,
              'hillshade-exaggeration':          0.45,
            },
          })
        } catch {}

        // 3D 건물
        try {
          map.addLayer({
            id: '3d-buildings', source: 'composite', 'source-layer': 'building',
            type: 'fill-extrusion', minzoom: 13,
            filter: ['==', 'extrude', 'true'],
            paint: {
              'fill-extrusion-color':   isDark ? '#1a2335' : '#c8bfb0',
              'fill-extrusion-height':  ['get', 'height'],
              'fill-extrusion-base':    ['get', 'min_height'],
              'fill-extrusion-opacity': isDark ? 0.75 : 0.45,
            },
          })
        } catch {}

        // 현재 진행 위치 계산 → 스타일 교체 후 즉시 올바른 위치로 표시
        const progress             = Math.min(accRideMsRef.current / sampler.journeyMs, 1)
        const [curLng, curLat]     = sampler.posAt(progress)
        const curBrg               = sampler.bearingAt(progress)
        const trail                = sampler.trailAt(progress)

        // 전체 경로 (점선 가이드)
        map.addSource('route-full', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
        })
        map.addLayer({
          id: 'route-ghost', type: 'line', source: 'route-full',
          layout: { 'line-cap': 'butt', 'line-join': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 1.5, 'line-opacity': 0.07, 'line-dasharray': [2, 5] },
        })

        // 지나온 경로 (현재 진행률로 즉시 복원)
        map.addSource('route-done', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: trail } },
        })
        map.addLayer({
          id: 'route-done-glow', type: 'line', source: 'route-done',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#2dd4bf', 'line-width': 14, 'line-opacity': 0.15, 'line-blur': 3 },
        })
        map.addLayer({
          id: 'route-done-outline', type: 'line', source: 'route-done',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#0f766e', 'line-width': 6.5, 'line-opacity': 0.55 },
        })
        map.addLayer({
          id: 'route-done-main', type: 'line', source: 'route-done',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#2dd4bf', 'line-width': 3.5, 'line-opacity': 1.0 },
        })

        // ── Three.js 바이크 3D 커스텀 레이어 ──────────────────────────────────
        // 차고와 동일한 모델을 Mapbox 위에 올려 경로를 따라 달리게 함
        const DEG_TO_RAD = Math.PI / 180
        const bikeColor  = getCurrentBikeColor()
        const { scene: bikeScene, camera: bikeCamera } = createBike3DScene(bikeColor)
        let bikeRenderer: THREE.WebGLRenderer | null = null

        // 초기 위치 세팅
        bikeTransformRef.current = { lng: curLng, lat: curLat, bearing: curBrg }

        map.addLayer({
          id:             'bike-3d',
          type:           'custom' as const,
          renderingMode:  '3d',
          onAdd(_: mapboxgl.Map, gl: WebGLRenderingContext) {
            bikeRenderer = new THREE.WebGLRenderer({
              canvas:    map.getCanvas(),
              context:   gl,
              antialias: true,
            })
            bikeRenderer.autoClear = false
          },
          render(_: WebGLRenderingContext, matrix: number[]) {
            if (!bikeRenderer) return
            const { lng, lat, bearing } = bikeTransformRef.current
            const mc = mapboxgl.MercatorCoordinate.fromLngLat([lng, lat], 0)
            // 1미터를 Mercator 단위로 변환 후 스케일 계산 (20m 크기)
            const s  = mc.meterInMercatorCoordinateUnits() * 6

            // Mapbox 행렬 → Three.js Camera projection matrix
            const m = new THREE.Matrix4().fromArray(matrix)
            const l = new THREE.Matrix4()
              .makeTranslation(mc.x, mc.y, mc.z)
              .scale(new THREE.Vector3(s, -s, s))                           // Mercator Y축 반전 보정
              .multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2))   // 바이크를 수직으로 세움
              .multiply(new THREE.Matrix4().makeRotationZ(-bearing * DEG_TO_RAD)) // 진행 방향으로 회전

            bikeCamera.projectionMatrix = m.multiply(l)
            bikeRenderer.resetState()
            bikeRenderer.render(bikeScene, bikeCamera)
            map.triggerRepaint()
          },
        } as unknown as mapboxgl.AnyLayer)
      }

      // ── 애니메이션 상태 — seekFn 과 tick 이 같은 closure 를 공유 ──────────
      let camPitch          = view.pitch
      let camBrg            = sampler.bearingAt(0)
      let smoothedTargetBrg = camBrg   // 이중 EMA 1단계 버퍼 (target을 먼저 부드럽게)
      let orbitBrg          = camBrg
      let lastViewId        = view.id
      let smoothedKmh       = 0
      let hasEnded          = false   // onEnd 는 1회만 호출
      let manualBrgOffset   = 0       // 정지 중 슬라이드로 회전한 누적 오프셋

      // 탐색 함수 — progress bar 포인터 이벤트에서 호출됨
      // fraction: 0~1 (0 = 시작, 1 = 끝)
      const seekFn = (fraction: number) => {
        const clamped = Math.max(0, Math.min(1, fraction))
        accRideMsRef.current = clamped * sampler.journeyMs
        // 카메라 방위각을 탐색 위치로 즉시 스냅 (버퍼도 함께 리셋 → 스냅 후 부드럽게)
        camBrg            = sampler.bearingAt(clamped)
        smoothedTargetBrg = camBrg
        orbitBrg          = camBrg
        manualBrgOffset   = 0   // 탐색 시 수동 회전 오프셋 초기화
        smoothedKmh       = 0
        if (clamped < 1) hasEnded = false
      }
      onSeekReady?.(seekFn)

      // 수동 회전 콜백 등록 — VideoPreviewPage 슬라이드 제스처에서 호출
      onManualRotateReady?.((deltaBrg: number) => {
        manualBrgOffset += deltaBrg
      })

      // 시점 버튼 클릭 → 커스텀(회전·줌) 초기화 콜백
      // camBrg에 offset을 먼저 흡수시키고 0으로 리셋 → 부드럽게 기본 시점으로 복귀
      onViewResetReady?.(() => {
        camBrg          = (camBrg + manualBrgOffset + 360) % 360
        manualBrgOffset = 0
        viewZoomTarget  = viewRef.current.zoom
      })

      // ref 에 저장 → 스타일 교체 useEffect 에서 재호출
      addLayersRef.current = addLayers

      const isDarkInit = mapStyle.includes('dark-v11')
      await addLayers(isDarkInit)

      // ── 추억 핀 마커 초기 등록 ────────────────────────────────────────────
      mapReadyRef.current = true
      rebuildPinMarkers()

      // 좌표 역산 콜백 — VideoPreviewPage 에서 롱프레스 위치 → lat/lng 변환용
      onCoordLookupReady?.((clientX, clientY) => {
        if (!mapRef.current || !containerRef.current) return null
        const rect = containerRef.current.getBoundingClientRect()
        const { lng, lat } = mapRef.current.unproject(
          [clientX - rect.left, clientY - rect.top] as [number, number]
        )
        return { lat, lng }
      })

      // 핀 탭 히트 테스트 — 오버레이에서 단탭 시 핀 근처인지 확인
      onPinTapCheckReady?.((clientX, clientY) => {
        for (let i = 0; i < markersRef.current.length; i++) {
          const el   = markersRef.current[i].getElement()
          const rect = el.getBoundingClientRect()
          // 마커 주변 12px 히트 영역 확장 (핀 끝 등 작은 영역 보완)
          if (
            clientX >= rect.left   - 12 && clientX <= rect.right  + 12 &&
            clientY >= rect.top    - 12 && clientY <= rect.bottom + 12
          ) {
            return pinsRef.current[i] ?? null
          }
        }
        return null
      })

      // ── 렌더 루프 ────────────────────────────────────────────────────────
      let started = false
      let lastTs  = 0

      const startAnim = () => {
        if (started) return
        started = true
        activeRef.current = true
        lastTs  = performance.now()
        let frameCount = 0

        const tick = (now: number) => {
          if (!activeRef.current) return

          const dt = lastTs === 0 ? 0 : now - lastTs
          lastTs   = now

          if (!isPausedRef.current) {
            accRideMsRef.current += dt * BASE_PREVIEW_RATE * speedRef.current
          }

          const progress = Math.min(accRideMsRef.current / sampler.journeyMs, 1)
          onProgress(Math.round(progress * 100))

          // 종료 감지 (1회만) — tick 은 seekFn 을 위해 계속 실행
          if (progress >= 1 && !hasEnded) {
            hasEnded = true
            onEnd?.()
          }

          const rawKmh = sampler.speedAt(progress)
          smoothedKmh  = smoothedKmh + (rawKmh - smoothedKmh) * 0.08
          onSpeed?.(Math.max(0, smoothedKmh))

          const [tLng, tLat] = sampler.posAt(progress)
          const tBrg         = sampler.bearingAt(progress)
          // 현재 위치 → VideoPreviewPage 근접 감지용 (30프레임마다)
          frameCount++
          if (frameCount % 30 === 0) onPositionRef.current?.(tLat, tLng)
          const v            = viewRef.current

          let targetBrg: number
          switch (v.animStyle) {
            case 'side':  targetBrg = tBrg + 90;  break
            case 'front': targetBrg = tBrg + 180; break
            case 'orbit':
              orbitBrg += 0.3
              targetBrg  = orbitBrg
              break
            case 'sweep': targetBrg = tBrg + Math.sin(progress * Math.PI * 5) * 25; break
            case 'arc':   targetBrg = tBrg + Math.sin(progress * Math.PI * 1.5) * 50; break
            default:      targetBrg = tBrg
          }

          if (v.animStyle === 'orbit') {
            camBrg = orbitBrg
          } else {
            // 이중 EMA: GPS 노이즈와 급격한 커브 모두 완충
            // 1단계: rawTarget → smoothedTargetBrg (느린 추적으로 방향 전환 자체를 부드럽게)
            smoothedTargetBrg = lerpBearing(smoothedTargetBrg, targetBrg, TGT_SMOOTH)
            // 2단계: smoothedTarget → camBrg (카메라가 스무딩된 목표를 천천히 따라감)
            camBrg = lerpBearing(camBrg, smoothedTargetBrg, BRG_LERP)
          }
          camPitch = camPitch + (v.pitch - camPitch) * 0.06

          if (v.id !== lastViewId) {
            // 다른 시점 버튼 클릭 — 기본값으로 초기화 (onViewResetReady 경로와 동일)
            camBrg          = (camBrg + manualBrgOffset + 360) % 360
            manualBrgOffset = 0
            lastViewId      = v.id
            viewZoomTarget  = v.zoom
          }
          currentZoom += (viewZoomTarget - currentZoom) * 0.04
          // manualBrgOffset 는 의도적으로 감쇠하지 않음 → 재생 재개 후에도 커스텀 시점 유지

          // 스타일 교체 중에는 소스가 일시적으로 없을 수 있음 → ?. 로 안전하게 처리
          ;(map.getSource('route-done') as mapboxgl.GeoJSONSource | undefined)?.setData({
            type: 'Feature', properties: {},
            geometry: { type: 'LineString', coordinates: sampler.trailAt(progress) },
          })
          bikeTransformRef.current = { lng: tLng, lat: tLat, bearing: tBrg }

          const displayBrg = (camBrg + manualBrgOffset + 360) % 360
          map.jumpTo({ center: [tLng, tLat], bearing: displayBrg, pitch: camPitch, zoom: currentZoom })

          // seekFn 을 위해 종료 이후에도 루프 유지 (isPaused 중에도 카메라 계속 업데이트)
          rafRef.current = requestAnimationFrame(tick)
        }

        rafRef.current = requestAnimationFrame(tick)
      }

      map.once('idle', startAnim)
      setTimeout(startAnim, 3000)
    })

    return () => {
      activeRef.current = false
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('wheel',       onWheel)
      window.removeEventListener('touchstart',  onTouchStart)
      window.removeEventListener('touchmove',   onTouchMove)
      window.removeEventListener('touchend',    onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      mapReadyRef.current = false
      markersRef.current.forEach(m => m.remove())
      markersRef.current   = []
      map.remove()
      mapRef.current       = null
      addLayersRef.current = null
    }
  }, []) // eslint-disable-line

  // ── 스타일 변경 — 재생 위치·경로 유지, 지도 테마만 교체 ────────────────────
  // map.setStyle() 은 Mapbox 로드 카운트를 소모하지 않음 (무료 할당량 영향 없음)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !addLayersRef.current) return   // 맵 미초기화 시 무시

    const isDark = mapStyle.includes('dark-v11')
    map.setStyle(mapStyle)

    // style.load 이벤트 = 새 스타일 타일 로드 완료 → 소스·레이어 재등록
    map.once('style.load', () => {
      addLayersRef.current!(isDark)
    })
  }, [mapStyle]) // eslint-disable-line

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
  )
}
