# MotoLog PWA — Claude 작업 가이드

## 프로젝트 기본 정보

- **프로젝트 경로**: `C:\Users\HONG\moto-log\moto-log-app`
- **기술 스택**: React + TypeScript + Vite + Tailwind CSS
- **배포**: Vercel — `git push`하면 자동 배포됨
- **저장소**: https://github.com/alucard8422-del/moto-log
- **인증**: Supabase Auth

---

## 빌드 & 배포 방법

```bash
cd "C:\Users\HONG\moto-log\moto-log-app"
npm run build          # 빌드 확인
git add -A
git commit -m "..."
git push               # Vercel 자동 배포
```

---

## 주요 파일 구조

```
src/
├── features/
│   ├── my-routes/
│   │   ├── MyRoutesPage.tsx          # 내 경로 목록 페이지
│   │   ├── RoutePlanner.tsx          # 경로 작성 페이지 (핵심 오케스트레이터)
│   │   ├── routes/
│   │   │   ├── EditModal.tsx         # 경로 상세/수정 모달
│   │   │   └── routeUtils.ts         # LatLng 타입, 거리 계산
│   │   └── planner/
│   │       ├── PlannerMap.tsx        # 카카오맵 컴포넌트
│   │       ├── PlannerHeader.tsx     # 상단 헤더 (뒤로가기, 실행취소 등)
│   │       ├── ConfirmPanel.tsx      # 코스 확정 패널 (제목 입력, 저장)
│   │       ├── DeleteBubble.tsx      # 마커 탭 시 삭제 말풍선
│   │       ├── WaypointListSheet.tsx # 경유지 목록 패널 (순서변경, 삭제)
│   │       ├── PlaceSearchPanel.tsx  # 장소 검색 패널 (카카오 Places API)
│   │       ├── plannerUtils.ts       # 마커 이미지 생성 등 유틸
│   │       └── routing.ts            # Valhalla API 경로 탐색
│   ├── record/
│   │   └── MapPage.tsx              # 주행 기록 페이지 (GPS 트래킹)
│   └── community/                   # 커뮤니티 공유 기능
├── components/
│   ├── DriveSessionOverlay.tsx       # 주행 세션 오버레이 (내비 연동)
│   └── RoadviewModal.tsx            # 카카오 로드뷰 팝업
├── lib/
│   ├── courseStorage.ts             # 로컬스토리지 코스 저장/불러오기
│   ├── courseService.ts             # Supabase 서버 동기화
│   ├── naviUtils.ts                 # 내비게이션 앱 딥링크 유틸
│   └── driveSession.ts             # 주행 세션 상태 관리
└── types/
    └── ride.ts                      # NavigationType 등 공용 타입
```

---

## 핵심 API 키 & 외부 서비스

### 카카오 앱 키 종류
- **JavaScript 키**: `d2430786a3a92cc28ebf4f0a22993062` — Kakao Maps SDK, 카카오 로그인 JS SDK
- **네이티브 앱 키**: `6ef7c9ef39fab621fd855288f71a08ac` — Kakao Navi 딥링크 (`kakaonavi://`)
- **앱 ID**: `1458843`
- **배포 도메인**: `https://moto-log-eta.vercel.app`

### 카카오 Maps SDK
- SDK URL에 `&libraries=services` 필수 (Geocoder, Places 사용)
- `window.kakao.maps.services.Geocoder` — 역지오코딩 (좌표 → 주소)
- `window.kakao.maps.services.Places` — 장소 키워드 검색

### 카카오 내비 딥링크 형식
```
kakaonavi://navigate?appkey={네이티브앱키}&sp={lng},{lat}&spname=출발&ep={lng},{lat}&epname={이름}&via1={lng},{lat}&via1name={경유1}
```
- `appkey` = **네이티브 앱 키** 사용 (JavaScript 키 X → 인증 실패)
- 좌표 순서: **경도(lng), 위도(lat)** (일반적인 lat,lng 순서 반대)
- 경유지 최대 5개 (tmap도 5개, atlan 4개)

### T-map 딥링크 형식
```
tmap://route?startname=출발&startx={lng}&starty={lat}&goalname={이름}&goalx={lng}&goaly={lat}&reqCoordType=WGS84GEO&resCoordType=WGS84GEO&via1name=경유1&via1x={lng}&via1y={lat}
```

### Valhalla 경로 API
- 공개 API 사용 (도로 경로 계산)
- `src/features/my-routes/planner/routing.ts` 참고
- 고속도로·자동차전용도로 강하게 기피 설정

---

## 주요 기능 목록 (구현 완료)

### 경로 계획 (RoutePlanner)
- 지도 탭으로 경유지 추가 (최대 20개)
- Valhalla API로 도로 경로 자동 계산, 실패 시 직선 fallback
- **장소 검색** (PlaceSearchPanel): 카카오 Places API, 결과 탭→지도 이동+핀 표시, + 버튼→경유지 추가
- **경유지 목록** (WaypointListSheet): 순서 변경(위/아래 버튼 + 터치 드래그), 삭제, 방문 여부 태그
- **역지오코딩**: 경유지 좌표 → 주소명 자동 표시
- **수정 모드**: 기존 코스 불러와서 경유지만 수정 후 저장 (새 코스 생성 X)
- 코스 확정 시 제목 입력, 공개/비공개 선택

### 경로 수정 진입 방법
1. 내 경로 페이지 → 계획 경로 항목 열기
2. EditModal에서 "경유지 수정하기" 버튼 (PenLine 아이콘)
3. RoutePlanner로 이동, 기존 경유지 전체 범위로 지도 표시
4. 수정 후 "경유지 수정 완료" → 기존 코스 업데이트 (새 글 생성 안 됨)

### 카카오 내비 — JS SDK 방식 (현재 적용)
- `kakaonavi://` 딥링크는 카카오 비즈니스 파트너 심사 필요(유료) → **사용 불가**
- 대신 `Kakao.Navi.start()` JS SDK 사용 (JavaScript 키, 별도 심사 없음)
- `window.Kakao`(JS SDK, 대문자) ≠ `window.kakao`(Maps SDK, 소문자) — 별개 객체
- SDK viaPoints 최대 3개 / 실패 시 `kakaomap://route` 폴백

### 주행 세션 (DriveSessionOverlay)
- **기록(GPS) 켜져 있을 때만 작동** (recordStatus === 'riding')
- 계획 경로를 구간 분할해서 순서대로 내비 실행
- **구간 분할 방식**: 겹침 없음 — 10개 경유지+T맵(max5) → 1구간[1-5] 2구간[6-10]
- 내비 실행 확인: `visibilitychange:hidden` (page hidden) 감지 → 세션 저장 → `naviActive`
- 복귀 감지: `naviActive` 상태일 때만 GPS 체크 실행 (다른 앱 전환 오작동 방지)
- 완료 문구 예시: "전체 경유지 10개 중 5개가 포함된 1구간을 완료했습니다"

---

## 자주 발생했던 버그 & 해결법

### pushState vs React Router location.state 충돌
- 증상: 경로 수정 진입 후 저장하면 새 코스가 생성됨
- 원인: `window.history.pushState()`가 React Router의 `location.state`를 덮어씀
- 해결: `editCourseId`를 `useRef`로 마운트 시점에 고정
```ts
const editCourseIdRef = useRef(importState.editCourseId ?? null)
const editCourseId    = editCourseIdRef.current   // re-render에도 유지
```

### 카카오 SDK 미로드 상태에서 Places 호출
- 증상: 검색 결과가 안 나오고 "검색중"으로 멈춤
- 해결: `waitForKakaoPlaces()` — 200ms 간격 폴링, 최대 5초 대기

### 구간 완료가 내비 실패해도 뜨는 문제
- 원인: `advanceDriveSegment()`를 내비 실행 시점에 호출
- 해결: `visibilitychange` 이벤트(앱 복귀 시)에서 호출 + 4초 이내 복귀 시 무시

---

## 작업 시 주의사항

- **빌드 후 푸시**: 코드 수정 후 반드시 `npm run build` 성공 확인 후 push
- **카카오 좌표**: `x = 경도(lng)`, `y = 위도(lat)` — Places API 결과가 이 형식
- **Tailwind 커스텀값**: `bg-white/8`, `bg-white/6` 등 슬래시 표기 사용 중
- **z-index 체계**:
  - 지도: 기본
  - 헤더/버튼: z-[1000]
  - WaypointListSheet 딤: z-[1050], 패널: z-[1060]
  - PlaceSearchPanel 딤: z-[1070], 패널: z-[1080]
  - 종료 확인 모달: z-[2000]~[2010]
- **색상 브랜드**: `#FF5A00` (주황) — 출발 마커: `#22c55e`, 도착: `#FF5A00`, 경유: `#94a3b8`
