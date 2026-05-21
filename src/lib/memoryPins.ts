// memoryPins.ts — 추억 핀 localStorage CRUD + EXIF GPS 추출
// 순수 스토리지 로직만. UI import 없음.

import exifr from 'exifr'
import type { MemoryPin } from '../types/video'

const KEY = 'moto:memoryPins'

function loadAll(): MemoryPin[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as MemoryPin[]
  } catch {
    return []
  }
}

function saveAll(pins: MemoryPin[]): void {
  localStorage.setItem(KEY, JSON.stringify(pins))
}

/** 특정 코스의 핀 목록 */
export function loadPins(courseId: string): MemoryPin[] {
  return loadAll().filter(p => p.courseId === courseId)
}

/** 핀 저장 (신규 추가) */
export function savePin(pin: MemoryPin): void {
  const all = loadAll()
  all.push(pin)
  saveAll(all)
}

/** 핀 여러 개 일괄 저장 */
export function savePins(pins: MemoryPin[]): void {
  const all = loadAll()
  saveAll([...all, ...pins])
}

/** 핀 삭제 */
export function deletePin(id: string): void {
  saveAll(loadAll().filter(p => p.id !== id))
}

// ── 내부 하버사인 (미터) ──────────────────────────────────────────────────
function haversineMInternal(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6_371_000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── EXIF GPS 추출 ──────────────────────────────────────────────────────────
/**
 * 사진 파일에서 EXIF GPS 좌표를 추출합니다.
 * GPS 정보가 없거나 추출 실패 시 null 반환.
 */
export async function extractExifGps(file: File): Promise<{ lat: number; lng: number } | null> {
  try {
    const gps = await (exifr as any).gps(file)
    if (!gps || gps.latitude == null || gps.longitude == null) return null
    // 유효 범위 체크 (대한민국 근방: lat 33~38, lng 124~132)
    const { latitude: lat, longitude: lng } = gps
    if (lat < 30 || lat > 42 || lng < 120 || lng > 135) return null
    return { lat, lng }
  } catch {
    return null
  }
}

// ── GPX 경로 상에서 가장 가까운 위치의 fraction 계산 ──────────────────────
/**
 * 주어진 좌표와 가장 가까운 GPX 포인트를 찾아 0~1 fraction을 반환.
 * fraction = 타임스탬프 기반 진행률
 */
export function findClosestFraction(
  lat: number,
  lng: number,
  gpxPoints: Array<{ lat: number; lng: number; timestamp: number }>
): number {
  if (gpxPoints.length < 2) return 0

  let minDist = Infinity
  let minIdx  = 0
  for (let i = 0; i < gpxPoints.length; i++) {
    const d = haversineMInternal(lat, lng, gpxPoints[i].lat, gpxPoints[i].lng)
    if (d < minDist) { minDist = d; minIdx = i }
  }

  const t0    = gpxPoints[0].timestamp
  const tN    = gpxPoints[gpxPoints.length - 1].timestamp
  const tDiff = tN - t0
  if (tDiff <= 0) return minIdx / (gpxPoints.length - 1)
  return (gpxPoints[minIdx].timestamp - t0) / tDiff
}

/** 가장 가까운 포인트까지의 거리 (미터) */
export function distToRoute(
  lat: number,
  lng: number,
  gpxPoints: Array<{ lat: number; lng: number; timestamp: number }>
): number {
  if (gpxPoints.length === 0) return Infinity
  let minDist = Infinity
  for (const p of gpxPoints) {
    const d = haversineMInternal(lat, lng, p.lat, p.lng)
    if (d < minDist) minDist = d
  }
  return minDist
}

// ── 사진 압축 (600px 이하 JPEG base64) ────────────────────────────────────
/** 사진을 600px 이하 JPEG base64로 압축 */
export async function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX   = 600
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const w     = Math.round(img.width  * scale)
      const h     = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지 로드 실패')) }
    img.src = url
  })
}
