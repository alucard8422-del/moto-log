// memoryPins.ts — 추억 핀 localStorage CRUD
// 순수 스토리지 로직만. UI import 없음.

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

/** 핀 삭제 */
export function deletePin(id: string): void {
  saveAll(loadAll().filter(p => p.id !== id))
}

/** 사진을 600px 이하 JPEG base64로 압축 */
export async function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 600
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const w = Math.round(img.width  * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지 로드 실패')) }
    img.src = url
  })
}
