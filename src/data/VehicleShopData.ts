// VehicleShopData.ts — 배기량 업그레이드 테크트리 데이터
export interface BikeModel {
  cc:       number   // 배기량
  name:     string   // 모델명
  flavor:   string   // 감성 문구
  cost:     number   // 필요 LP (첫 모델=0)
  mapColor: string   // 맵 위 바이크 아이콘 색상
}

export const BIKE_LINEUP: readonly BikeModel[] = [
  { cc: 50,   name: '50cc 미니 스쿠터',      flavor: '첫 출발, 골목길의 왕',          cost: 0,      mapColor: '#94a3b8' },
  { cc: 125,  name: '125cc 입문 스쿠터',     flavor: '이제 진짜 라이더 시작!',        cost: 500,    mapColor: '#38bdf8' },
  { cc: 250,  name: '250cc 미들 바이크',     flavor: '고속도로도 거뜬해',             cost: 1_200,  mapColor: '#4ade80' },
  { cc: 300,  name: '300cc 스포츠 네이키드', flavor: '와인딩 코너의 달인',            cost: 2_000,  mapColor: '#2dd4bf' },
  { cc: 400,  name: '400cc 클래식 네이키드', flavor: '클래식은 영원하다',             cost: 3_200,  mapColor: '#fb923c' },
  { cc: 500,  name: '500cc 듀얼 스포츠',    flavor: '온로드도 오프로드도 OK',        cost: 5_000,  mapColor: '#a3e635' },
  { cc: 600,  name: '600cc 슈퍼스포츠',     flavor: '서킷 데이 준비 완료',           cost: 8_000,  mapColor: '#facc15' },
  { cc: 1000, name: '1000cc 리터바이크',    flavor: '이제 날아다니는 거야',          cost: 15_000, mapColor: '#f43f5e' },
  { cc: 1600, name: '1600cc 크루저',        flavor: '전설의 라이더, 도로의 황제',    cost: 30_000, mapColor: '#c084fc' },
] as const

// localStorage 키
export const LP_KEY         = 'moto:lp'           // 보유 LP 포인트
export const OWNED_BIKES_KEY = 'moto:ownedBikes'  // 보유 cc 배열 JSON
