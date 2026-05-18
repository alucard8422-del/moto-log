// videoTypes.ts — 영상 만들기 관련 공유 타입

export type ViewType = 'vlog'

export interface ViewOption {
  id:          ViewType
  name:        string
  desc:        string
  emoji:       string
  pitch:       number   // 3D 카메라 기울기 (°) — 높을수록 수평에 가깝게 보임
  zoom:        number   // 카메라 줌 레벨
  bearing:     number   // 초기 방위각
  animStyle:   'sweep' | 'follow' | 'top' | 'arc' | 'lock'
}

export const VIEW_OPTIONS: ViewOption[] = [
  {
    id: 'vlog', name: '브이로그뷰', desc: '바이크 바로 뒤에서 함께 달리는 체이스캠',
    emoji: '📸', pitch: 75, zoom: 17, bearing: 0, animStyle: 'follow',
  },
]
