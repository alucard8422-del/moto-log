// scripts/generateSampleGpx.mjs
// 이화령 와인딩 코스 GPX 샘플 데이터 자동 생성기
//
// 실행: node scripts/generateSampleGpx.mjs
//
// 동작:
//   1. OSRM 공개 API 호출 (routing.ts 와 동일한 알고리즘 — 고속도로 제외)
//   2. 실제 도로를 따르는 좌표 배열 수신
//   3. 구간별 거리 → 70km/h 기준 타임스탬프 계산
//   4. src/data/sampleGpxData.ts 파일 자동 생성

import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_FILE  = join(__dirname, '..', 'src', 'data', 'sampleGpxData.ts')

// ── 이화령 코스 설정 ───────────────────────────────────────────────────────
// 충북 괴산군 연풍면 → (이화령 고개) → 경북 문경시
// 국내 대표 바이크 와인딩 성지, 고속도로·자동차전용도로 없음
const WAYPOINTS = [
  { lng: 127.893, lat: 36.828 },   // 출발: 괴산군 연풍면 입구
  { lng: 127.934, lat: 36.680 },   // 도착: 문경시 방향
]

const ROUTE_NAME    = '이화령 와인딩 코스'
const AVG_SPEED_KPH = 70        // 평균 속도 (60~80 구간)
const START_TIME    = new Date('2026-05-18T07:00:00+09:00')  // 오전 7시 출발

// ── 거리 계산 (Haversine) ──────────────────────────────────────────────────
function haversineM(lng1, lat1, lng2, lat2) {
  const R   = 6_371_000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(lat1 * Math.PI / 180)
          * Math.cos(lat2 * Math.PI / 180)
          * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── OSRM 호출 (routing.ts 와 동일) ────────────────────────────────────────
async function fetchOSRM() {
  const coordStr = WAYPOINTS.map(w => `${w.lng},${w.lat}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}`
            + `?overview=full&geometries=geojson&exclude=motorway`

  console.log('OSRM 호출 중...')
  console.log('URL:', url)

  const res  = await fetch(url)
  const data = await res.json()

  if (data.code !== 'Ok') {
    console.log(`motorway 제외 미지원 (${data.code}) → 일반 경로로 재시도...`)
    const url2 = `https://router.project-osrm.org/route/v1/driving/${coordStr}`
               + `?overview=full&geometries=geojson`
    const res2  = await fetch(url2)
    const data2 = await res2.json()
    if (data2.code !== 'Ok') throw new Error(`OSRM 오류: ${data2.code}`)
    const coords2 = data2.routes[0].geometry.coordinates
    const dist2   = data2.routes[0].distance
    const dur2    = data2.routes[0].duration
    console.log(`경로 수신: ${coords2.length}개 좌표, ${(dist2/1000).toFixed(1)}km, OSRM 예상 ${Math.round(dur2/60)}분`)
    return coords2
  }

  const coords = data.routes[0].geometry.coordinates  // [lng, lat][]
  const dist   = data.routes[0].distance              // meters
  const dur    = data.routes[0].duration              // seconds (OSRM 기준)

  console.log(`경로 수신: ${coords.length}개 좌표, ${(dist/1000).toFixed(1)}km, OSRM 예상 ${Math.round(dur/60)}분`)
  return coords
}

// ── 타임스탬프 생성 ────────────────────────────────────────────────────────
// 실제 구간 거리에 비례해서 시간 배분
// 산악 와인딩: 커브 구간은 자동으로 좌표가 밀집 → 느린 이동 시뮬레이션
function buildPoints(coords) {
  const speedMs = (AVG_SPEED_KPH * 1000) / 3600   // m/s
  let cumMs     = 0
  const startMs = START_TIME.getTime()

  return coords.map(([lng, lat], i) => {
    if (i > 0) {
      const [pLng, pLat] = coords[i - 1]
      const dist = haversineM(pLng, pLat, lng, lat)
      cumMs += (dist / speedMs) * 1000   // ms
    }
    return { lat, lng, timestamp: startMs + cumMs }
  })
}

// ── TypeScript 파일 생성 ───────────────────────────────────────────────────
// 타임스탬프를 스크립트에서 미리 계산해 직접 박아넣음 → 런타임 계산 없음
function buildTs(points) {
  // { lat, lng, timestamp } 를 한 줄씩 직렬화
  const pointLines = points.map(p =>
    `  { lat: ${p.lat.toFixed(6)}, lng: ${p.lng.toFixed(6)}, timestamp: ${p.timestamp} },`
  ).join('\n')

  const gpxTrkpts = points.map(p =>
    `    <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}">` +
    `<time>${new Date(p.timestamp).toISOString()}</time></trkpt>`
  ).join('\n')

  // 실제 누적 거리 계산 (직선 거리 합산)
  let totalDist = 0
  for (let i = 1; i < points.length; i++) {
    totalDist += haversineM(
      points[i-1].lng, points[i-1].lat,
      points[i].lng,   points[i].lat
    )
  }
  const totalKm  = (totalDist / 1000).toFixed(1)
  const totalMin = Math.round((points[points.length-1].timestamp - points[0].timestamp) / 60000)

  return `// sampleGpxData.ts — ${ROUTE_NAME}
// 자동 생성: node scripts/generateSampleGpx.mjs
// OSRM 실제 도로 경로 (고속도로·자동차전용도로 제외)
// 총 ${points.length}개 좌표 | ${totalKm}km | ${AVG_SPEED_KPH}km/h 기준 ${totalMin}분

export type GpxPoint = { lat: number; lng: number; timestamp: number }

// 타임스탬프가 미리 계산된 포인트 배열 (OSRM 실제 도로 경로)
const POINTS: GpxPoint[] = [
${pointLines}
]

export const SAMPLE_ROUTE_POINTS: GpxPoint[] = POINTS

// 하위 호환 별칭
export const YUSONG_SEOUL_POINTS = POINTS

// GPX XML 문자열 → GpxPoint[] 파서
export function parseGpxPoints(xml: string): GpxPoint[] {
  try {
    const parser = new DOMParser()
    const doc    = parser.parseFromString(xml, 'application/xml')
    const trkpts = Array.from(doc.querySelectorAll('trkpt'))
    return trkpts.map((el, i) => ({
      lat:       parseFloat(el.getAttribute('lat') ?? '0'),
      lng:       parseFloat(el.getAttribute('lon') ?? '0'),
      timestamp: new Date(el.querySelector('time')?.textContent ?? '').getTime() || i * 180_000,
    })).filter(p => !isNaN(p.lat) && !isNaN(p.lng))
  } catch {
    return []
  }
}

export const YUSONG_SEOUL_GPX_XML = \`<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Moto-Log" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>${ROUTE_NAME}</name><trkseg>
${gpxTrkpts}
  </trkseg></trk>
</gpx>\`
`
}

// ── 메인 ──────────────────────────────────────────────────────────────────
async function main() {
  try {
    const coords = await fetchOSRM()

    console.log(`좌표 처리 중... (${coords.length}개)`)
    const points = buildPoints(coords)

    const ts = buildTs(points)
    mkdirSync(dirname(OUT_FILE), { recursive: true })
    writeFileSync(OUT_FILE, ts, 'utf-8')

    console.log(`✅ 생성 완료: ${OUT_FILE}`)
    console.log(`   좌표 수: ${points.length}개`)
    console.log(`   거리: ${((points[points.length-1].timestamp - points[0].timestamp) / 60000).toFixed(0)}분 분량`)
    console.log(`   시작: ${new Date(points[0].timestamp).toISOString()}`)
    console.log(`   종료: ${new Date(points[points.length-1].timestamp).toISOString()}`)
  } catch (err) {
    console.error('❌ 오류:', err.message)
    process.exit(1)
  }
}

main()
