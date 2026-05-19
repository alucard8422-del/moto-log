// MapboxRecorder.tsx — 실시간 GPX 속도 동기화 + 체이스캠
//
// ─── 핵심 설계 원칙 ──────────────────────────────────────────────────────
//
//  [시간 기반 애니메이션 흐름]
//   videoElapsed (ms) → 영상이 재생된 실제 시간
//   rideElapsed  (ms) → videoElapsed × PLAYBACK_RATE = 실제 라이딩 경과 시간
//   t (0~1)           → rideElapsed / journeyMs = 전체 경로 중 현재 진행률
//
//  [Catmull-Rom 스플라인 보간]
//   원래 GPX 포인트 사이를 곡선으로 연결 → 직선 꺾임 없이 부드러운 이동
//   원래 타임스탬프도 구간별로 보간되어 실제 속도 그대로 유지
//
//  [GL 심볼 레이어 바이크]
//   HTML Marker(캔버스 외부) → symbol layer(WebGL 내부)
//   → canvas.captureStream()으로 영상에 포착됨
//
//  [렌더 루프 동기화]
//   RAF 단독 사용 시 Mapbox 렌더와 어긋남 → 끊김 발생
//   map.on('render') + map.triggerRepaint() 로 Mapbox 렌더와 완벽 동기

import { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { ViewOption } from './videoTypes'
import type { GpxPoint } from '../../constants/sampleGpxData'
import { loadBikeImage } from '../../lib/bikeUtils'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string

// ═══════════════════════════════════════════════════════════════════════════
//  ① 설정 상수
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 실제 시간 → 영상 시간 배율
 * 150 = 1초 영상이 현실 150초(2.5분)에 해당
 * ┌─────────────────────────────────────────────────────┐
 * │  실제 3시간 라이딩 기준 영상 길이                     │
 * │  PLAYBACK_RATE=100 → 108s   (약 1분 48초)           │
 * │  PLAYBACK_RATE=150 → 72s    (약 1분 12초) ← 기본값  │
 * │  PLAYBACK_RATE=300 → 36s                            │
 * └─────────────────────────────────────────────────────┘
 */
const PLAYBACK_RATE = 150


/**
 * 배링(방위) 전환 부드러움 (0~1)
 * 낮을수록 코너에서 카메라가 천천히 스윙
 */
const BRG_LERP = 0.08

/**
 * Catmull-Rom 스플라인 — GPS 포인트당 보간 분할 수
 * 높을수록 곡선이 부드러움 (성능과 트레이드오프)
 */
const SPLINE_SEGS = 12

// ═══════════════════════════════════════════════════════════════════════════
//  ② 수학 헬퍼
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 배링 선형 보간 — 360° wrap-around 처리
 * 예) 350° → 10°: 일반 lerp는 -340° 역방향, 이 함수는 +20° 순방향
 */
function lerpBearing(a: number, b: number, t: number): number {
  let d = b - a
  while (d >  180) d -= 360
  while (d < -180) d += 360
  return a + d * t
}

/** 두 지리좌표 사이의 진북 기준 방위각(°) 계산 */
function calcBearing(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R    = Math.PI / 180
  const dLng = (lng2 - lng1) * R
  const la1  = lat1 * R, la2 = lat2 * R
  const y = Math.sin(dLng) * Math.cos(la2)
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360
}

/**
 * Catmull-Rom 스플라인 1차원 보간
 * p0~p3: 제어점, t: 0~1 (p1~p2 사이 진행률)
 * 특징: 모든 제어점을 통과하는 자연스러운 곡선 생성
 */
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2*p0 - 5*p1 + 4*p2 - p3) * t2 +
    (-p0 + 3*p1 - 3*p2 + p3) * t3
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ③ Catmull-Rom 스플라인 적용 GPX 샘플러
// ═══════════════════════════════════════════════════════════════════════════
type Pt = { lat: number; lng: number; timestamp: number }

/**
 * 원본 GPX 포인트를 Catmull-Rom 스플라인으로 보간해
 * 부드러운 곡선 경로를 생성합니다.
 * 타임스탬프도 구간별로 선형 보간되어 실제 속도가 유지됩니다.
 */
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
        lng: catmullRom(p0.lng, p1.lng, p2.lng, p3.lng, t),
        lat: catmullRom(p0.lat, p1.lat, p2.lat, p3.lat, t),
        timestamp: p1.timestamp + (p2.timestamp - p1.timestamp) * t,
      })
    }
  }
  result.push(pts[pts.length - 1])
  return result
}

function buildSampler(rawPts: Pt[]) {
  // 스플라인 보간된 고밀도 포인트 사용
  const pts      = splinePoints(rawPts)
  const t0       = pts[0].timestamp
  const tN       = pts[pts.length - 1].timestamp
  const journeyMs = Math.max(tN - t0, 1)

  // 구간 방위각 사전 계산
  const segBearings = pts.slice(0, -1).map((p, i) =>
    calcBearing(p.lng, p.lat, pts[i + 1].lng, pts[i + 1].lat)
  )

  /** 진행률 → [lng, lat] */
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

  /** 진행률 → 도로 방위각 */
  function bearingAt(progress: number): number {
    const rideTime = t0 + Math.max(0, Math.min(0.9999, progress)) * journeyMs
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].timestamp >= rideTime) {
        const cur   = segBearings[i - 1]
        const next  = segBearings[i] ?? cur
        const segDt = pts[i].timestamp - pts[i - 1].timestamp
        const segT  = segDt > 0 ? (rideTime - pts[i - 1].timestamp) / segDt : 0
        return lerpBearing(cur, next, Math.max(0, segT * 2 - 1))
      }
    }
    return segBearings[segBearings.length - 1] ?? 0
  }

  /** 진행률 → 지나온 좌표 배열 (progressive drawing) */
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

  const animMs = Math.min(90_000, Math.max(15_000, journeyMs / PLAYBACK_RATE))
  return { posAt, bearingAt, trailAt, animMs, journeyMs, firstPt: pts[0] }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ④ 바이크 GL 심볼 이미지 (canvas.captureStream 에 포착됨)
//    HTML Marker는 DOM 오버레이라 캔버스에 안 잡힘 → 반드시 addImage 사용
//    차고에서 업그레이드된 바이크 색상이 자동으로 반영됩니다 (bikeUtils.ts)
// ═══════════════════════════════════════════════════════════════════════════

/** GeoJSON Point feature (바이크 위치 + 방위각) */
function bikeGeoJSON(lng: number, lat: number, bearing: number): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: { bearing },
    geometry: { type: 'Point', coordinates: [lng, lat] },
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ⑤ 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════
interface Props {
  points:     GpxPoint[] | Array<{ lat: number; lng: number; timestamp: number }>
  view:       ViewOption
  onProgress: (pct: number) => void
  onComplete: (blob: Blob) => void
}

interface CamState { brg: number }

export default function MapboxRecorder({ points, view, onProgress, onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<mapboxgl.Map | null>(null)
  const recorderRef  = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<Blob[]>([])
  const startTsRef   = useRef(0)
  const camRef       = useRef<CamState>({ brg: 0 })
  const activeRef    = useRef(false)   // render loop 활성 여부

  // 뷰마다 직접 지정된 pitch/zoom 사용 (고정 상수로 override 하지 않음)
  const camPitch = view.pitch
  const camZoom  = view.zoom

  const startRecording = useCallback(() => {
    const map = mapRef.current
    if (!map) return

    const pts     = points as Pt[]
    const sampler = buildSampler(pts)

    // 카메라 초기 bearing 설정
    camRef.current = { brg: sampler.bearingAt(0) }
    activeRef.current = true

    const canvas   = map.getCanvas()
    const stream   = canvas.captureStream(30)
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 })
    recorderRef.current = recorder
    chunksRef.current   = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => onComplete(new Blob(chunksRef.current, { type: mimeType }))
    recorder.start(200)
    startTsRef.current = performance.now()

    // ─────────────────────────────────────────────────────────────────────
    //  Mapbox 렌더 루프와 동기화된 tick
    //  map.on('render') = Mapbox가 실제로 그린 직후 호출
    //  map.triggerRepaint() = 다음 프레임 요청
    //  → RAF 단독 사용보다 끊김이 없음
    // ─────────────────────────────────────────────────────────────────────
    const tick = () => {
      if (!activeRef.current) return

      const now          = performance.now()
      const videoElapsed = now - startTsRef.current
      const rideElapsed  = videoElapsed * PLAYBACK_RATE
      const progress     = Math.min(rideElapsed / sampler.journeyMs, 1)

      onProgress(Math.round(progress * 100))

      // Target: GPX 타임스탬프 기반 실제 위치/방위
      const [tLng, tLat] = sampler.posAt(progress)
      const tBrg         = sampler.bearingAt(progress)

      // animStyle별 배링 오프셋
      // Bearing만 LERP (위치는 즉시 반영 → 바이크 항상 화면 중앙)
      const cam = camRef.current

      let targetBrg: number
      switch (view.animStyle) {
        case 'side':   targetBrg = tBrg + 90;  break
        case 'front':  targetBrg = tBrg + 180; break
        case 'orbit':  targetBrg = cam.brg + 0.3; break  // 매 프레임 0.3° 공전
        case 'sweep':  targetBrg = tBrg + Math.sin(progress * Math.PI * 5) * 25; break
        case 'arc':    targetBrg = tBrg + Math.sin(progress * Math.PI * 1.5) * 50; break
        default:       targetBrg = tBrg
      }
      cam.brg = lerpBearing(cam.brg, targetBrg, BRG_LERP)

      // 지나온 경로 점진적 그리기
      ;(map.getSource('route-done') as mapboxgl.GeoJSONSource)?.setData({
        type: 'Feature', properties: {},
        geometry: { type: 'LineString', coordinates: sampler.trailAt(progress) },
      })

      // 바이크 GL 심볼 위치/방위 업데이트
      // icon-rotation-alignment: 'map' 이므로 진북 기준 방위각을 넘김
      ;(map.getSource('bike-pos') as mapboxgl.GeoJSONSource)?.setData(
        bikeGeoJSON(tLng, tLat, tBrg)
      )

      // 카메라: 바이크 위치 중앙 고정, bearing만 스무딩
      map.jumpTo({
        center:  [tLng, tLat],
        bearing: cam.brg,
        pitch:   camPitch,
        zoom:    camZoom,
      })

      if (progress < 1) {
        map.triggerRepaint()   // 다음 렌더 프레임 요청
      } else {
        activeRef.current = false
        map.off('render', tick)
        recorder.stop()
      }
    }

    map.on('render', tick)
    map.triggerRepaint()   // 첫 프레임 시작
  }, [points, view, camPitch, camZoom, onProgress, onComplete])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const pts    = points as Pt[]
    const first  = pts[0]
    const initBrg = calcBearing(
      pts[0].lng, pts[0].lat,
      pts[1]?.lng ?? pts[0].lng,
      pts[1]?.lat ?? pts[0].lat,
    )

    const map = new mapboxgl.Map({
      container:             containerRef.current,
      style:                 'mapbox://styles/mapbox/dark-v11',
      center:                [first.lng, first.lat],
      zoom:                  camZoom,
      pitch:                 camPitch,
      bearing:               initBrg,
      preserveDrawingBuffer: true,
      antialias:             true,
      interactive:           false,
    })
    mapRef.current = map

    map.on('load', async () => {
      const coords = pts.map(p => [p.lng, p.lat]) as [number, number][]

      // ── 3D 지형 DEM (exaggeration 낮춰 선이 땅속에 들어가는 현상 감소) ──
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512, maxzoom: 14,
      })
      try { map.setTerrain({ source: 'mapbox-dem', exaggeration: 0.5 }) } catch {}

      // ── 야간 안개 ──────────────────────────────────────────────────────
      try {
        map.setFog({
          color: 'rgb(12, 18, 40)', 'high-color': 'rgb(6, 10, 28)',
          'horizon-blend': 0.04, range: [0.8, 10],
        })
      } catch {}

      // ── 3D 건물 ────────────────────────────────────────────────────────
      map.addLayer({
        id: '3d-buildings', source: 'composite', 'source-layer': 'building',
        type: 'fill-extrusion', minzoom: 12,
        filter: ['==', 'extrude', 'true'],
        paint: {
          'fill-extrusion-color':   '#1a2335',
          'fill-extrusion-height':  ['get', 'height'],
          'fill-extrusion-base':    ['get', 'min_height'],
          'fill-extrusion-opacity': 0.75,
        },
      })

      // ── 전체 경로 가이드라인 (희미한 점선) — 건물 레이어 위에 추가 ────
      map.addSource('route-full', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
      })
      map.addLayer({
        id: 'route-ghost', type: 'line', source: 'route-full',
        layout: { 'line-cap': 'butt', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 1.5, 'line-opacity': 0.07, 'line-dasharray': [2, 5] },
      })

      // ── 지나온 경로 (매 프레임 동적 업데이트) — 건물 위, 바이크 아래 ──
      map.addSource('route-done', {
        type: 'geojson',
        data: {
          type: 'Feature', properties: {},
          geometry: { type: 'LineString', coordinates: [coords[0], coords[0]] },
        },
      })
      map.addLayer({
        id: 'route-done-glow', type: 'line', source: 'route-done',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#2dd4bf', 'line-width': 22, 'line-opacity': 0.13, 'line-blur': 10 },
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

      // ── 출발·도착 핀 마커 (mapboxgl.Marker — 미리보기용, 영상엔 불필요) ─
      new mapboxgl.Marker({ color: '#2dd4bf' }).setLngLat([first.lng, first.lat]).addTo(map)
      new mapboxgl.Marker({ color: '#f87171' }).setLngLat([pts[pts.length - 1].lng, pts[pts.length - 1].lat]).addTo(map)

      // ── 바이크 GL 심볼 레이어 ──────────────────────────────────────────
      //   HTML Marker 대신 addImage + symbol layer 사용
      //   → WebGL 캔버스 내부에 렌더됨 → canvas.captureStream() 에 포착됨
      try {
        const bikeImg = await loadBikeImage()
        map.addImage('bike-icon', bikeImg, { pixelRatio: 2 })
      } catch {
        // 이미지 로드 실패 시 원형 폴백 (HTMLCanvasElement 미지원 → ImageData 변환)
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 32
        const ctx = canvas.getContext('2d')!
        ctx.beginPath(); ctx.arc(16, 16, 12, 0, Math.PI * 2)
        ctx.fillStyle = '#2dd4bf'; ctx.fill()
        map.addImage('bike-icon', ctx.getImageData(0, 0, 32, 32))
      }

      map.addSource('bike-pos', {
        type: 'geojson',
        data: bikeGeoJSON(first.lng, first.lat, 0),
      })
      map.addLayer({
        id: 'bike-shadow', type: 'symbol', source: 'bike-pos',
        layout: {
          'icon-image':                'bike-icon',
          'icon-size':                 1,
          'icon-rotate':               ['get', 'bearing'],
          'icon-rotation-alignment':   'map',      // 북쪽 기준 회전
          'icon-pitch-alignment':      'map',      // 3D pitch에서도 지면에 붙음
          'icon-allow-overlap':        true,
          'icon-ignore-placement':     true,
        },
        paint: {
          'icon-opacity': 0.35,
          'icon-translate': [3, 3],               // 그림자 효과
          'icon-color': '#000000',
        },
      })
      map.addLayer({
        id: 'bike-layer', type: 'symbol', source: 'bike-pos',
        layout: {
          'icon-image':                'bike-icon',
          'icon-size':                 1,
          'icon-rotate':               ['get', 'bearing'],
          'icon-rotation-alignment':   'map',
          'icon-pitch-alignment':      'map',
          'icon-allow-overlap':        true,
          'icon-ignore-placement':     true,
        },
      })

      // ── 지도 로딩 완료 대기 후 녹화 시작 ──────────────────────────────
      let recordStarted = false
      const doStartRecording = () => {
        if (recordStarted) return
        recordStarted = true
        startRecording()
      }
      map.once('idle', doStartRecording)
      setTimeout(doStartRecording, 3000)   // 3초 폴백
    })

    return () => {
      activeRef.current = false
      recorderRef.current?.stop()
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  )
}
