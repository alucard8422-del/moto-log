// pinTypes.ts — 추억 핀 타입 정의

export interface MemoryPin {
  id:         string
  courseId:   string
  lat:        number
  lng:        number
  fraction:   number    // 0~1, 핀 생성 시점의 재생 위치 (근접 감지 보조)
  photo?:     string    // base64 JPEG (600px 압축)
  memo?:      string
  createdAt:  string
}
