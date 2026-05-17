// TourPage.tsx — 추천 코스 3섹션 레이아웃
// Section 1: AI 맞춤 추천 캐러셀 (상단)
// Section 2: 라이더 공유 광장 (2열 그리드, 중단)
// Section 3: 코스 탐색 필터 + 세로 리스트 (하단)
import { useState, useMemo, useEffect } from 'react'
import { Flame, ChevronRight, Clock, MapPin } from 'lucide-react'
import SmartRecommendSection, { type RankedCourse } from './tour/SmartRecommendSection'
import CourseDetailModal from '../components/CourseDetailModal'
import { loadCommunityCourses, type SavedCourse } from '../lib/courseStorage'
import type { CourseCardData } from './tour/CourseCard'

// ── 카테고리 필터 ──────────────────────────────────────────────────────────
type FilterId = 'all' | 'short' | 'mid' | 'long' | 'cafe'

const FILTERS: { id: FilterId; label: string; match: (c: RankedCourse) => boolean }[] = [
  { id: 'all',   label: '전체',         match: () => true },
  { id: 'short', label: '🏍 근거리',    match: (c) => (c.durationMin ?? 0) <= 120 },
  { id: 'mid',   label: '🗺 중거리',    match: (c) => { const d = c.durationMin ?? 0; return d > 120 && d <= 240 } },
  { id: 'long',  label: '🏁 장거리',   match: (c) => (c.durationMin ?? 0) > 240 },
  { id: 'cafe',  label: '☕ 카페',      match: (c) => c.title.includes('카페') },
]

// ── 120개 모크 데이터 생성기 ─────────────────────────────────────────────
const IMGS = [
  'photo-1506905925346-21bda4d32df4','photo-1464822759023-fed622ff2c3b',
  'photo-1501854140801-50d01698950b','photo-1507525428034-b723cf961d3e',
  'photo-1522383225653-ed111181a951','photo-1564761901467-7a53e3c0d211',
  'photo-1470071459604-3b5ec3a7fe05','photo-1476514525535-07fb3b4ae5f1',
  'photo-1441974231531-c6227db76b6e','photo-1469854523086-cc02fe5d8800',
  'photo-1519821172143-5818dcba9dff','photo-1544735716-392fe2489ffa',
]
type Mood = '여유로운' | '감성적인' | '도전적인'
type Spec = [string, string, number, number, Mood]

// 결정론적 pseudo-random (seed = index)
const seededRc  = (i: number) => 30 + (i * 47 + 11) % 471          // 추천수 30-500
const seededRat = (i: number) => +((3.5 + (i * 13 % 15) / 10).toFixed(1)) // 별점 3.5-4.9
const seededImg = (i: number, base = 0) =>
  `https://images.unsplash.com/${IMGS[(i + base) % IMGS.length]}?w=400&q=70`

function buildCourses(specs: Spec[], prefix: string, imgBase = 0): RankedCourse[] {
  return specs.map(([title, region, distanceKm, durationMin, mood], i) => ({
    id: `${prefix}${i}`,
    title, region, distanceKm, durationMin, mood,
    imageUrl: seededImg(i, imgBase),
    rating:         seededRat(i),
    recommendCount: seededRc(i),
  }))
}

// ── 근거리 30개 (≤120분) ──────────────────────────────────────────────────
const SHORT_SPECS: Spec[] = [
  ['북한산 카페 루프',       '서울 은평',   38,  65, '여유로운'],
  ['구리 한강 야경 투어',    '경기 구리',   42,  55, '감성적인'],
  ['인천 을왕리 해변',       '인천 중구',   52,  75, '여유로운'],
  ['수원 화성 성곽길',       '경기 수원',   35,  50, '감성적인'],
  ['파주 헤이리 드라이브',   '경기 파주',   55,  80, '여유로운'],
  ['양주 장흥 계곡',         '경기 양주',   48,  70, '여유로운'],
  ['남양주 북한강 둘레',     '경기 남양주', 60,  85, '감성적인'],
  ['가평 청평 호수길',       '경기 가평',   72, 100, '여유로운'],
  ['의왕 백운호수 루프',     '경기 의왕',   32,  45, '여유로운'],
  ['안산 시화호 일몰',       '경기 안산',   58,  80, '감성적인'],
  ['부천 원미산 벚꽃',       '경기 부천',   28,  40, '감성적인'],
  ['강화 마니산 드라이브',   '인천 강화',   68,  95, '도전적인'],
  ['과천 청계산 드라이브',   '경기 과천',   36,  52, '여유로운'],
  ['고양 행주산성 야경',     '경기 고양',   45,  62, '감성적인'],
  ['하남 미사 한강',         '경기 하남',   40,  55, '여유로운'],
  ['시흥 갯골 생태길',       '경기 시흥',   44,  62, '여유로운'],
  ['용인 에버랜드 루트',     '경기 용인',   65,  90, '여유로운'],
  ['광주 남한산성',          '경기 광주',   50,  72, '도전적인'],
  ['포천 산정호수',          '경기 포천',   78, 110, '여유로운'],
  ['연천 재인폭포',          '경기 연천',   85, 115, '감성적인'],
  ['김포 문수산 루트',       '경기 김포',   52,  75, '여유로운'],
  ['화성 공룡알 해변',       '경기 화성',   68,  92, '감성적인'],
  ['오산 독산성 드라이브',   '경기 오산',   38,  55, '여유로운'],
  ['안성 죽산성지',          '경기 안성',   70,  98, '감성적인'],
  ['여주 신륵사 강변',       '경기 여주',   82, 112, '여유로운'],
  ['이천 도예마을 투어',     '경기 이천',   72, 100, '여유로운'],
  ['평택 아우라지 드라이브', '경기 평택',   65,  88, '감성적인'],
  ['군포 수리산 드라이브',   '경기 군포',   34,  48, '도전적인'],
  ['성남 청계산 야경',       '경기 성남',   42,  60, '감성적인'],
  ['의정부 수락산 루트',     '경기 의정부', 46,  65, '도전적인'],
]

// ── 중거리 30개 (121-240분) ───────────────────────────────────────────────
const MID_SPECS: Spec[] = [
  ['춘천 의암호 레이크',     '강원 춘천',   92, 125, '여유로운'],
  ['양평 용문산 단풍길',     '경기 양평',   95, 130, '감성적인'],
  ['홍천 수타사 계곡',       '강원 홍천',  105, 140, '여유로운'],
  ['충주 수안보 온천길',     '충북 충주',  115, 150, '여유로운'],
  ['공주 마곡사 단풍',       '충남 공주',  120, 158, '감성적인'],
  ['계룡산 드라이브',        '대전 유성',  118, 152, '도전적인'],
  ['인제 내린천 계곡',       '강원 인제',  130, 170, '도전적인'],
  ['원주 치악산 고갯길',     '강원 원주',  110, 145, '도전적인'],
  ['청주 미동산 수목원',     '충북 청주',  108, 142, '여유로운'],
  ['세종 조치원 커피거리',   '세종시',     115, 152, '여유로운'],
  ['천안 아우내 장터',       '충남 천안',  112, 148, '감성적인'],
  ['보령 대천해수욕장',      '충남 보령',  145, 185, '여유로운'],
  ['서산 간월도 낙조',       '충남 서산',  150, 190, '감성적인'],
  ['태안 신두리 사구',       '충남 태안',  155, 195, '여유로운'],
  ['당진 왜목마을 일출',     '충남 당진',  140, 180, '감성적인'],
  ['아산 현충사 드라이브',   '충남 아산',  125, 162, '여유로운'],
  ['논산 선샤인랜드',        '충남 논산',  138, 175, '감성적인'],
  ['금산 적벽강 단풍',       '충남 금산',  145, 182, '감성적인'],
  ['제천 청풍호 드라이브',   '충북 제천',  148, 188, '여유로운'],
  ['괴산 산막이옛길',        '충북 괴산',  140, 178, '여유로운'],
  ['단양 도담삼봉',          '충북 단양',  155, 195, '감성적인'],
  ['영주 부석사 드라이브',   '경북 영주',  160, 200, '감성적인'],
  ['문경 새재 옛길',         '경북 문경',  155, 195, '도전적인'],
  ['상주 낙동강 자전거길',   '경북 상주',  148, 188, '여유로운'],
  ['구미 금오산 드라이브',   '경북 구미',  135, 172, '도전적인'],
  ['김천 직지사 사찰길',     '경북 김천',  142, 180, '여유로운'],
  ['안동 하회마을 투어',     '경북 안동',  168, 210, '감성적인'],
  ['예천 회룡포 전망대',     '경북 예천',  162, 205, '감성적인'],
  ['봉화 청량산 드라이브',   '경북 봉화',  175, 218, '도전적인'],
  ['울진 금강송 숲길',       '경북 울진',  180, 225, '여유로운'],
]

// ── 장거리 30개 (241분↑) ──────────────────────────────────────────────────
const LONG_SPECS: Spec[] = [
  ['강릉 정동진 일출',       '강원 강릉',  248, 300, '감성적인'],
  ['속초 설악산 뱀처럼',     '강원 속초',  265, 320, '도전적인'],
  ['대관령 선자령 고갯길',   '강원 평창',  255, 310, '도전적인'],
  ['동해 추암촛대바위',      '강원 동해',  270, 325, '감성적인'],
  ['삼척 죽서루 해안',       '강원 삼척',  285, 342, '여유로운'],
  ['부산 해운대 라이딩',     '부산 해운대',400, 462, '여유로운'],
  ['경주 불국사 투어',       '경북 경주',  350, 420, '감성적인'],
  ['울산 간절곶 일출',       '울산 울주',  365, 438, '감성적인'],
  ['지리산 성삼재 루트',     '전남 구례',  310, 375, '도전적인'],
  ['순천 낙안읍성 드라이브', '전남 순천',  320, 385, '여유로운'],
  ['여수 돌산도 해안',       '전남 여수',  345, 412, '감성적인'],
  ['남해 이순신대교',        '경남 남해',  380, 452, '감성적인'],
  ['통영 한려수도 드라이브', '경남 통영',  370, 442, '감성적인'],
  ['거제 해금강 루트',       '경남 거제',  390, 465, '여유로운'],
  ['창원 마산 해안로',       '경남 창원',  355, 425, '여유로운'],
  ['광양 매화마을',          '전남 광양',  325, 390, '감성적인'],
  ['보성 녹차밭 드라이브',   '전남 보성',  338, 405, '여유로운'],
  ['담양 메타세쿼이아길',    '전남 담양',  298, 358, '여유로운'],
  ['함평 나비축제 루트',     '전남 함평',  310, 372, '여유로운'],
  ['고흥 우주센터 드라이브', '전남 고흥',  355, 428, '도전적인'],
  ['목포 유달산 야경',       '전남 목포',  340, 408, '감성적인'],
  ['해남 땅끝마을 최남단',   '전남 해남',  380, 455, '도전적인'],
  ['완도 청산도 드라이브',   '전남 완도',  395, 472, '여유로운'],
  ['진도 울돌목 바다',       '전남 진도',  375, 450, '감성적인'],
  ['제주 한림 해안도로',     '제주 한림',  290, 350, '여유로운'],
  ['제주 성산일출봉',        '제주 서귀포',310, 375, '감성적인'],
  ['제주 1100고지 드라이브', '제주 제주시',268, 322, '도전적인'],
  ['제주 올레길 라이딩',     '제주 서귀포',280, 338, '여유로운'],
  ['전주 한옥마을 투어',     '전북 전주',  258, 312, '감성적인'],
  ['군산 근대역사 드라이브', '전북 군산',  275, 330, '감성적인'],
]

// ── 카페투어 30개 (title에 '카페' 포함) ──────────────────────────────────
const CAFE_SPECS: Spec[] = [
  ['북한산 카페 순례',       '서울 은평',   38,  65, '여유로운'],
  ['강남 카페 호핑 투어',    '서울 강남',   25,  40, '여유로운'],
  ['홍대 카페 크롤링',       '서울 마포',   22,  35, '감성적인'],
  ['성수 카페 레이드',       '서울 성동',   28,  45, '감성적인'],
  ['연남동 카페 산책',       '서울 마포',   18,  30, '여유로운'],
  ['이태원 카페 투어',       '서울 용산',   26,  42, '감성적인'],
  ['망원 카페 골목',         '서울 마포',   20,  32, '감성적인'],
  ['양평 카페 거리 탐방',    '경기 양평',   95, 130, '여유로운'],
  ['가평 카페 라이딩',       '경기 가평',   85, 118, '여유로운'],
  ['파주 헤이리 카페 투어',  '경기 파주',   55,  80, '여유로운'],
  ['남양주 카페 밀집지역',   '경기 남양주', 62,  88, '여유로운'],
  ['춘천 카페거리 투어',     '강원 춘천',   95, 128, '여유로운'],
  ['강릉 커피거리 라이딩',   '강원 강릉',  248, 298, '감성적인'],
  ['대전 카페 투어 루트',    '대전 중구',  118, 155, '감성적인'],
  ['전주 카페 한옥마을',     '전북 전주',  258, 312, '감성적인'],
  ['경주 황리단길 카페',     '경북 경주',  348, 418, '감성적인'],
  ['부산 해운대 카페 투어',  '부산 해운대',398, 460, '여유로운'],
  ['통영 카페 항구길',       '경남 통영',  368, 440, '감성적인'],
  ['여수 돌산 카페 라이딩',  '전남 여수',  342, 410, '감성적인'],
  ['제주 애월 카페 벨트',    '제주 제주시',268, 322, '여유로운'],
  ['제주 카페 메종길',       '제주 서귀포',278, 335, '여유로운'],
  ['목포 카페 거리',         '전남 목포',  338, 405, '감성적인'],
  ['안동 하회 카페 투어',    '경북 안동',  165, 208, '감성적인'],
  ['속초 아바이마을 카페',   '강원 속초',  262, 318, '여유로운'],
  ['고성 카페 해변길',       '강원 고성',  278, 335, '감성적인'],
  ['충주 탄금호 카페 루트',  '충북 충주',  115, 152, '여유로운'],
  ['공주 카페 산성길',       '충남 공주',  120, 158, '여유로운'],
  ['서산 카페 간월도',       '충남 서산',  148, 188, '감성적인'],
  ['태안 꽃지 카페 라이딩',  '충남 태안',  155, 195, '여유로운'],
  ['보령 카페 대천해변',     '충남 보령',  142, 182, '여유로운'],
]

// ── 통합 120개 ────────────────────────────────────────────────────────────
const RECOMMENDED: RankedCourse[] = [
  ...buildCourses(SHORT_SPECS, 's', 0),
  ...buildCourses(MID_SPECS,   'm', 3),
  ...buildCourses(LONG_SPECS,  'l', 6),
  ...buildCourses(CAFE_SPECS,  'k', 9),
]

const SORTED = [...RECOMMENDED].sort((a, b) => b.recommendCount - a.recommendCount)

// ── SavedCourse → CourseCardData 변환 ─────────────────────────────────────
function savedToCard(c: SavedCourse): CourseCardData {
  const parts = [c.startCity, c.endCity].filter(Boolean)
  return {
    id: c.id,
    title: c.title,
    region: parts.length > 0 ? parts.join(' → ') : '대한민국',
    imageUrl: c.coverPhoto,
    mood: '여유로운',
    distanceKm: c.distanceKm,
    durationMin: c.durationMin,
    rating: c.starRating ?? 0,
    description: c.diary,
    tags: [],
  }
}

// ── 무드 색상 ──────────────────────────────────────────────────────────────
const MOOD_CHIP: Record<CourseCardData['mood'], string> = {
  '여유로운': 'text-emerald-400 bg-emerald-400/15',
  '감성적인': 'text-violet-400 bg-violet-400/15',
  '도전적인': 'text-rose-400   bg-rose-400/15',
}

// ── 섹션 구분선 ───────────────────────────────────────────────────────────
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-0.5">
      <div className="h-px flex-1 bg-white/5" />
      <span className="text-[10px] font-light text-white/20">{label}</span>
      <div className="h-px flex-1 bg-white/5" />
    </div>
  )
}

// ── Section 2: 공유 광장 2열 그리드 ─────────────────────────────────────
interface CommunityGridProps {
  courses: SavedCourse[]
  onPress: (c: CourseCardData, savedId: string) => void
}

function CommunityGrid({ courses, onPress }: CommunityGridProps) {
  if (courses.length === 0) return null
  // 별점 높은 순 → 최근 등록 순 2차 정렬
  const sorted = [...courses].sort((a, b) => {
    const stars = (b.starRating ?? 0) - (a.starRating ?? 0)
    if (stars !== 0) return stars
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const isNew = (iso: string) =>
    Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000

  return (
    <div className="flex flex-col gap-4">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <Flame size={14} strokeWidth={1.5} className="text-orange-400" />
          <span className="text-sm font-bold text-white">라이더 공유 광장</span>
          <span className="rounded-full bg-orange-400/15 px-2 py-0.5 text-[9px] font-bold text-orange-400">
            LIVE
          </span>
        </div>
        <span className="text-[10px] font-light text-white/25">별점순</span>
      </div>

      {/* 2열 그리드 */}
      <div className="grid grid-cols-2 gap-2.5">
        {sorted.map((saved) => {
          const card = savedToCard(saved)
          return (
            <button
              key={saved.id}
              onClick={() => onPress(card, saved.id)}
              className="group relative h-44 overflow-hidden rounded-3xl active:scale-[0.97] transition-transform duration-200"
            >
              {/* 배경 사진 */}
              {card.imageUrl ? (
                <img src={card.imageUrl} alt={card.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0 bg-[#0b1120] flex items-center justify-center">
                  <span className="text-3xl opacity-30">🏍</span>
                </div>
              )}

              {/* 하단 강그라데이션 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

              {/* NEW 뱃지 */}
              {isNew(saved.createdAt) && (
                <div className="absolute left-2.5 top-2.5 rounded-full bg-teal-400 px-2 py-0.5">
                  <span className="text-[9px] font-bold text-slate-950">NEW</span>
                </div>
              )}


              {/* 하단 텍스트 */}
              <div className="absolute bottom-0 inset-x-0 p-3">
                <p className="text-left text-[12px] font-bold leading-snug text-white line-clamp-2">
                  {card.title}
                </p>
                <p className="mt-0.5 text-left text-[10px] font-light text-white/50">
                  {card.region}
                </p>
                {/* 일기 미리보기 */}
                {card.description && (
                  <p className="mt-1 text-left text-[9px] font-light text-white/35 line-clamp-1">
                    {card.description}
                  </p>
                )}
                {/* 댓글 수 */}
                {(saved.comments?.length ?? 0) > 0 && (
                  <p className="mt-1 text-left text-[9px] font-light text-teal-400/60">
                    💬 {saved.comments!.length}개의 댓글
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Section 3: 필터 칩 바 ────────────────────────────────────────────────
function ChipBar({ active, onChange }: { active: FilterId; onChange: (id: FilterId) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {FILTERS.map((f) => {
        const on = f.id === active
        return (
          <button key={f.id} onClick={() => onChange(f.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-[12px] backdrop-blur-xl transition-all duration-200 active:scale-95 ${
              on ? 'border border-[#2DD4BF] bg-[#2DD4BF]/10 font-medium text-[#2DD4BF]'
                 : 'border border-white/8 bg-[#161B26]/60 font-light text-white/40'
            }`}>
            {f.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Section 3: 세로 리스트 아이템 ────────────────────────────────────────
function CourseListItem({ course, onPress }: { course: RankedCourse; onPress: (c: CourseCardData) => void }) {
  return (
    <button
      onClick={() => onPress(course)}
      className="flex w-full items-center gap-3.5 rounded-2xl border border-white/5 bg-white/[0.03] p-3 transition-colors active:bg-white/[0.06]"
    >
      {/* 썸네일 */}
      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl">
        {course.imageUrl ? (
          <img src={course.imageUrl} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-slate-800 flex items-center justify-center">
            <span className="text-lg opacity-30">🏍</span>
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[13px] font-bold text-white line-clamp-1">{course.title}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-light text-white/40">
          <MapPin size={9} strokeWidth={1.5} />
          <span className="truncate">{course.region}</span>
          <span>·</span>
          <span>{course.distanceKm}km</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="flex items-center gap-0.5 text-[10px] font-light text-white/30">
            <Clock size={9} strokeWidth={1.5} />
            {course.durationMin}분
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-light ${MOOD_CHIP[course.mood]}`}>
            {course.mood}
          </span>
        </div>
      </div>

      <ChevronRight size={14} strokeWidth={1.5} className="shrink-0 text-white/20" />
    </button>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────
export default function TourPage() {
  const [activeFilter, setActiveFilter] = useState<FilterId>('all')
  const [selected, setSelected]         = useState<CourseCardData | null>(null)
  const [selectedSavedId, setSelectedSavedId] = useState<string | undefined>(undefined)
  const [communityKey, setCommunityKey] = useState(0)

  // MyRoutesPage 공유 완료 이벤트 → 공유 광장 즉시 갱신
  useEffect(() => {
    const handler = () => setCommunityKey((k) => k + 1)
    window.addEventListener('moto:community-updated', handler)
    return () => window.removeEventListener('moto:community-updated', handler)
  }, [])

  // 커뮤니티 코스 (이벤트·모달 닫힐 때 재로드)
  const communityCourses = useMemo(
    () => loadCommunityCourses(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [communityKey]
  )

  // 큐레이션 필터링 (세로 리스트용)
  const filtered = useMemo(() => {
    const fn = FILTERS.find((f) => f.id === activeFilter)?.match ?? (() => true)
    return SORTED.filter(fn)
  }, [activeFilter])

  const handleSelectCurated   = (c: CourseCardData) => { setSelected(c); setSelectedSavedId(undefined) }
  const handleSelectCommunity = (c: CourseCardData, savedId: string) => { setSelected(c); setSelectedSavedId(savedId) }
  const handleClose           = () => { setSelected(null); setSelectedSavedId(undefined); setCommunityKey((k) => k + 1) }

  return (
    <div className="flex flex-col gap-6 px-4 pt-5 pb-32">

      {/* ── 페이지 헤더 ── */}
      <div>
        <p className="text-xs font-light text-white/30">라이더가 검증한 코스</p>
        <h2 className="text-xl font-bold text-white">추천 코스</h2>
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — AI 맞춤 추천 캐러셀 (최상단, 3개)
      ══════════════════════════════════════════════════════ */}
      <SmartRecommendSection
        courses={RECOMMENDED}
        onPress={handleSelectCurated}
        limit={3}
      />

      <Divider label="실시간 공유" />

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — 라이더 공유 광장 (2열 그리드)
      ══════════════════════════════════════════════════════ */}
      {communityCourses.length > 0 ? (
        <CommunityGrid courses={communityCourses} onPress={handleSelectCommunity} />
      ) : (
        /* 공유된 코스 없을 때 넛지 메시지 */
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-white/8 py-8 text-center">
          <p className="text-sm font-bold text-white/20">아직 공유된 코스가 없어요</p>
          <p className="text-xs font-light text-white/15">
            내 경로에서 주행 후기를 작성하고<br />공유해보세요
          </p>
        </div>
      )}

      <Divider label="코스 탐색" />

      {/* ══════════════════════════════════════════════════════
          SECTION 3 — 필터 칩 + 세로 리스트
      ══════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-4">
        {/* 섹션 헤더 */}
        <div className="flex items-center justify-between px-0.5">
          <span className="text-sm font-bold text-white">전체 코스 탐색</span>
          <span className="text-[10px] font-light text-white/25">{filtered.length}개</span>
        </div>

        {/* 필터 칩 바 */}
        <ChipBar active={activeFilter} onChange={setActiveFilter} />

        {/* 세로 리스트 */}
        {filtered.length > 0 ? (
          <div className="flex flex-col gap-2">
            {filtered.map((course) => (
              <CourseListItem key={course.id} course={course} onPress={handleSelectCurated} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm font-bold text-white/30">해당 카테고리의 코스가 없어요</p>
            <button onClick={() => setActiveFilter('all')}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-light text-white/40 active:opacity-60">
              전체 보기
            </button>
          </div>
        )}
      </div>

      {/* ── 상세 모달 ── */}
      {selected && (
        <CourseDetailModal
          course={selected}
          savedCourseId={selectedSavedId}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
