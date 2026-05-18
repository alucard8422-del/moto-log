// routing.ts — 도로 경로 탐색
//
// OSRM 공개 API (router.project-osrm.org)
//  - CORS 완전 지원, API 키 불필요
//  - 실제 도로 경로 반환 (GeoJSON)
//  - exclude=motorway: 고속도로 제외 시도
//    → 제외 불가 구간은 자동으로 일반 경로 fallback
//  - 최종 fallback: 직선 [from, to]

import type { LatLng } from '../routes/routeUtils'

// GeoJSON 좌표 파싱: OSRM 은 [경도, 위도] 순서
function parseOSRM(data: any): LatLng[] | null {
  if (data?.code !== 'Ok') return null
  const coords = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined
  if (!coords || coords.length < 2) return null
  return coords.map(([lon, lat]) => ({ lat, lng: lon }))
}

async function callOSRM(from: LatLng, to: LatLng, exclude?: string): Promise<LatLng[] | null> {
  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 7_000)

  try {
    const ex  = exclude ? `&exclude=${exclude}` : ''
    const url = `https://router.project-osrm.org/route/v1/driving/` +
                `${from.lng},${from.lat};${to.lng},${to.lat}` +
                `?overview=full&geometries=geojson${ex}`

    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    return parseOSRM(await res.json())
  } catch {
    clearTimeout(timer)
    return null
  }
}

// ── 경로 탐색 (export) ──────────────────────────────────────────────────────
// 1차: motorway(고속도로) 제외
// 2차: 제한 없이 실제 도로
// 3차: 직선 fallback
export async function fetchRoute(from: LatLng, to: LatLng): Promise<LatLng[]> {
  const withExclude = await callOSRM(from, to, 'motorway')
  if (withExclude && withExclude.length >= 2) return withExclude

  const plain = await callOSRM(from, to)
  if (plain && plain.length >= 2) return plain

  return [from, to]
}
