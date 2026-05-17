// CourseDetailSheet.tsx
import { Navigation, MapPin, Flag, Route, Clock } from 'lucide-react'

// ─── 타입 정의 ────────────────────────────────────────────────
interface Coord { lat: number; lng: number }

export interface CourseSheetData {
  title: string
  region: string
  distanceKm: number
  durationMin: number
  difficulty: 'easy' | 'medium' | 'hard'
  gpxPoints: Coord[]
}

interface Props {
  isOpen: boolean
  data: CourseSheetData | null
  onClose: () => void
}

// ─── GPX → 경유지 추출 ───────────────────────────────────────
// 전체 포인트에서 시작 / 33% / 66% / 끝 인덱스를 균등 추출
function extractWaypoints(pts: Coord[]) {
  const n = pts.length
  if (n < 2) return null
  return {
    start: pts[0],
    via1:  pts[Math.floor(n * 0.33)],
    via2:  pts[Math.floor(n * 0.66)],
    goal:  pts[n - 1],
  }
}

// ─── 딥링크 빌더 ─────────────────────────────────────────────
// TMap: tmap://route?goalname=&goalx=경도&goaly=위도&v1x=&v1y=&v2x=&v2y=
function buildTMapUrl(pts: Coord[]): string {
  const wp = extractWaypoints(pts)
  if (!wp) return 'tmap://search'
  const p = new URLSearchParams({
    goalname: '목적지',
    goalx: String(wp.goal.lng),
    goaly: String(wp.goal.lat),
    v1x:   String(wp.via1.lng),
    v1y:   String(wp.via1.lat),
    v2x:   String(wp.via2.lng),
    v2y:   String(wp.via2.lat),
  })
  return `tmap://route?${p}`
}

// KakaoNavi: kakaonavi://route?goalname=&goalx=경도&goaly=위도&v1x=&v1y=&v2x=&v2y=
function buildKakaoUrl(pts: Coord[]): string {
  const wp = extractWaypoints(pts)
  if (!wp) return 'kakaonavi://search'
  const p = new URLSearchParams({
    goalname: '목적지',
    goalx: String(wp.goal.lng),
    goaly: String(wp.goal.lat),
    v1x:   String(wp.via1.lng),
    v1y:   String(wp.via1.lat),
    v2x:   String(wp.via2.lng),
    v2y:   String(wp.via2.lat),
  })
  return `kakaonavi://route?${p}`
}

const STORE_FALLBACK: Record<string, string> = {
  tmap:  'https://apps.apple.com/kr/app/tmap/id431589174',
  kakao: 'https://apps.apple.com/kr/app/id668182711',
}

// 앱 미설치 시 1.5s 후 스토어로 폴백
function launchNavi(url: string, fallbackKey: string) {
  window.location.href = url
  setTimeout(() => window.open(STORE_FALLBACK[fallbackKey], '_blank'), 1500)
}

// ─── 유틸 ────────────────────────────────────────────────────
function fmtMin(m: number): string {
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`
}

const DIFFICULTY_LABEL: Record<CourseSheetData['difficulty'], string> = {
  easy:   '초급',
  medium: '중급',
  hard:   '고급',
}
const DIFFICULTY_COLOR: Record<CourseSheetData['difficulty'], string> = {
  easy:   'text-emerald-400',
  medium: 'text-amber-400',
  hard:   'text-rose-400',
}

// ─── 컴포넌트 ────────────────────────────────────────────────
export default function CourseDetailSheet({ isOpen, data, onClose }: Props) {
  if (!data) return null

  const wp    = extractWaypoints(data.gpxPoints)
  const tmap  = buildTMapUrl(data.gpxPoints)
  const kakao = buildKakaoUrl(data.gpxPoints)

  const waypointRows = wp
    ? [
        { dot: 'bg-teal-400',  label: '출발',   coord: wp.start },
        { dot: 'bg-white/30',  label: '경유 1', coord: wp.via1  },
        { dot: 'bg-white/30',  label: '경유 2', coord: wp.via2  },
        { dot: 'bg-rose-400',  label: '목적지', coord: wp.goal  },
      ]
    : []

  return (
    <>
      {/* ── 백드롭 ── */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* ── 바텀 시트 ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto max-w-sm rounded-t-3xl border-t border-white/10 bg-[#111622]/95 px-6 pt-5 pb-12 backdrop-blur-xl">

          {/* 핸들바 */}
          <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-white/20" />

          {/* 코스 헤더 */}
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-400/10">
              <Flag size={16} strokeWidth={1.5} className="text-teal-400" />
            </div>
            <div className="flex-1">
              <p className="text-base font-bold leading-snug text-white">{data.title}</p>
              <div className="mt-1 flex items-center gap-2">
                <MapPin size={10} strokeWidth={1.5} className="text-white/30" />
                <span className="text-xs font-light text-white/40">{data.region}</span>
                <span className={`text-[10px] font-bold ${DIFFICULTY_COLOR[data.difficulty]}`}>
                  {DIFFICULTY_LABEL[data.difficulty]}
                </span>
              </div>
            </div>
          </div>

          {/* 거리 / 시간 칩 */}
          <div className="mb-5 flex gap-2">
            {[
              { icon: <Route size={12} strokeWidth={1.5} className="text-teal-400" />, value: `${data.distanceKm} km`, label: '총 거리' },
              { icon: <Clock size={12} strokeWidth={1.5} className="text-teal-400" />, value: fmtMin(data.durationMin), label: '예상 시간' },
            ].map(({ icon, value, label }) => (
              <div key={label} className="flex flex-1 items-center gap-2.5 rounded-2xl bg-white/5 px-4 py-3">
                {icon}
                <div>
                  <p className="text-sm font-bold text-white">{value}</p>
                  <p className="text-[9px] font-light text-white/30">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 경유지 프리뷰 */}
          {waypointRows.length > 0 && (
            <div className="mb-5 rounded-2xl bg-white/5 px-4 py-3">
              <p className="mb-2 text-[9px] font-light uppercase tracking-widest text-white/25">
                경유지 프리뷰
              </p>
              <div className="flex flex-col gap-2">
                {waypointRows.map(({ dot, label, coord }, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                    <span className="w-12 shrink-0 text-[10px] font-light text-white/30">{label}</span>
                    <span className="text-[10px] tabular-nums text-white/50">
                      {coord.lat.toFixed(5)}, {coord.lng.toFixed(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 내비 실행 버튼 */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => launchNavi(tmap, 'tmap')}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-400/10 py-4 text-sm font-bold text-teal-400 ring-1 ring-teal-400/20 transition-opacity active:opacity-70"
            >
              <Navigation size={13} strokeWidth={1.5} />
              티맵
            </button>
            <button
              onClick={() => launchNavi(kakao, 'kakao')}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-yellow-400/10 py-4 text-sm font-bold text-yellow-300 ring-1 ring-yellow-400/20 transition-opacity active:opacity-70"
            >
              <Navigation size={13} strokeWidth={1.5} />
              카카오내비
            </button>
          </div>

          {/* 면책 안내 */}
          <p className="text-center text-xs leading-relaxed text-white/40">
            외부 내비게이션의 제약으로 인해 실제 GPX 경로와<br />미세한 차이가 있을 수 있습니다.
          </p>

        </div>
      </div>
    </>
  )
}
