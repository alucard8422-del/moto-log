// types/video.ts — 영상 만들기 + 추억 핀 관련 공유 타입

// ── videoTypes.ts ─────────────────────────────────────────────────────────

export type ViewType = 'chase' | 'side' | 'front' | 'lowangle' | 'orbit'

export interface ViewOption {
  id:        ViewType
  name:      string
  desc:      string
  emoji:     string
  pitch:     number
  zoom:      number
  bearing:   number
  animStyle: 'follow' | 'side' | 'front' | 'orbit' | 'sweep' | 'arc'
}

export const VIEW_OPTIONS: ViewOption[] = [
  {
    id: 'chase', name: '체이스캠', emoji: '🏍️',
    desc: '바이크 바로 뒤에서 바짝 따라가기',
    pitch: 75, zoom: 17, bearing: 0, animStyle: 'follow',
  },
  {
    id: 'side', name: '사이드캠', emoji: '📸',
    desc: '옆에서 바라보는 역동적인 시점',
    pitch: 58, zoom: 15, bearing: 0, animStyle: 'side',
  },
  {
    id: 'front', name: '프론트캠', emoji: '🎬',
    desc: '앞에서 마주 오는 바이크 시점',
    pitch: 65, zoom: 15, bearing: 0, animStyle: 'front',
  },
  {
    id: 'lowangle', name: '저각도캠', emoji: '🔥',
    desc: '지면에 바짝 붙은 드라마틱한 저각도',
    pitch: 83, zoom: 17, bearing: 0, animStyle: 'follow',
  },
  {
    id: 'orbit', name: '오빗캠', emoji: '🌀',
    desc: '바이크 주변을 천천히 공전',
    pitch: 55, zoom: 14, bearing: 0, animStyle: 'orbit',
  },
]

// ── pinTypes.ts ──────────────────────────────────────────────────────────

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
