import { useEffect, useState } from 'react'
import { Fuel, MapPin, Calendar, Gauge } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export interface FuelRecord {
  id: string
  date: string
  fuelType: '일반유' | '고급유'
  amount: number
  totalKm: number
  stationName: string
}

const MOCK: FuelRecord[] = [
  { id: 'm1', date: '2026-05-15T14:32:00Z', fuelType: '고급유', amount: 28000, totalKm: 12340, stationName: 'GS주유소 강남점' },
  { id: 'm2', date: '2026-04-28T09:10:00Z', fuelType: '일반유', amount: 22000, totalKm: 11890, stationName: 'SK에너지 서초' },
  { id: 'm3', date: '2026-04-10T18:55:00Z', fuelType: '일반유', amount: 19500, totalKm: 11420, stationName: 'S-OIL 잠실점' },
  { id: 'm4', date: '2026-03-22T11:30:00Z', fuelType: '고급유', amount: 31000, totalKm: 10980, stationName: 'GS칼텍스 송파' },
  { id: 'm5', date: '2026-02-14T16:00:00Z', fuelType: '일반유', amount: 18000, totalKm: 10500, stationName: '현대오일뱅크 강동' },
  { id: 'm6', date: '2026-01-08T08:20:00Z', fuelType: '일반유', amount: 24000, totalKm: 10100, stationName: 'SK에너지 성동' },
]

async function fetchFuelLogs(): Promise<FuelRecord[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return MOCK
  const { data, error } = await supabase
    .from('fuel_logs').select('*').eq('user_id', user.id)
    .order('logged_at', { ascending: false })
  if (error || !data?.length) return MOCK
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((r: any): FuelRecord => ({
    id: r.id, date: r.logged_at,
    fuelType: r.fuel_type === 'premium' ? '고급유' : '일반유',
    amount: r.amount, totalKm: r.total_km ?? 0, stationName: r.store_name,
  }))
}

/* ── Area Chart ── */
function FuelAreaChart({ logs }: { logs: FuelRecord[] }) {
  const W = 320
  const H = 110
  const PL = 4
  const PR = 4
  const PT = 12
  const PB = 24

  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return { year: d.getFullYear(), month: d.getMonth(), label: `${d.getMonth() + 1}월` }
  })

  const totals = months.map(({ year, month }) =>
    logs.filter((l) => {
      const d = new Date(l.date)
      return d.getFullYear() === year && d.getMonth() === month
    }).reduce((s, l) => s + l.amount, 0)
  )

  const maxVal = Math.max(...totals, 1)
  const cw = (W - PL - PR) / (months.length - 1)
  const ch = H - PT - PB

  const pts = totals.map((v, i) => ({
    x: PL + i * cw,
    y: PT + ch * (1 - v / maxVal),
  }))

  const smoothPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return ''
    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(points.length - 1, i + 2)]
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }
    return d
  }

  const linePath = smoothPath(pts)
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${H - PB} L ${pts[0].x} ${H - PB} Z`

  return (
    <div className="rounded-3xl bg-[#161B26]/60 p-4 backdrop-blur-xl">
      <p className="mb-2 text-[10px] font-light uppercase tracking-widest text-white/30">
        월별 주유 금액
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 격자 수평선 2개 */}
        {[0.33, 0.66].map((r) => (
          <line
            key={r}
            x1={PL} y1={PT + ch * r} x2={W - PR} y2={PT + ch * r}
            stroke="rgba(255,255,255,0.05)" strokeWidth="1"
          />
        ))}

        {/* 면 */}
        <path d={areaPath} fill="url(#fuelGrad)" />
        {/* 선 */}
        <path d={linePath} fill="none" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* 데이터 점 */}
        {pts.map((p, i) => (
          totals[i] > 0 && (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="#2DD4BF" />
          )
        ))}

        {/* X축 레이블 */}
        {months.map((m, i) => (
          <text
            key={i}
            x={PL + i * cw} y={H - 4}
            textAnchor="middle"
            fontSize="9"
            fill="rgba(255,255,255,0.3)"
          >
            {m.label}
          </text>
        ))}
      </svg>
    </div>
  )
}

/* ── 기록 아이템 ── */
function FuelItem({ log }: { log: FuelRecord }) {
  const isPremium = log.fuelType === '고급유'
  const d = new Date(log.date)
  const dateStr = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  const timeStr = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="rounded-3xl bg-[#161B26]/60 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <span className={`text-xs font-bold ${isPremium ? 'text-teal-400' : 'text-white/50'}`}>
          {log.fuelType}
        </span>
        <span className="text-base font-bold text-white">{log.amount.toLocaleString()}원</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <MapPin size={11} strokeWidth={1.5} className="text-white/25" />
          <span className="text-xs font-light text-white/50">{log.stationName}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Calendar size={11} strokeWidth={1.5} className="text-white/25" />
            <span className="text-xs font-light text-white/35">{dateStr} {timeStr}</span>
          </div>
          {log.totalKm > 0 && (
            <div className="flex items-center gap-1.5">
              <Gauge size={11} strokeWidth={1.5} className="text-white/25" />
              <span className="text-xs font-light text-white/35">{log.totalKm.toLocaleString()} km</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── 메인 탭 ── */
export default function FuelLogTab() {
  const [logs, setLogs] = useState<FuelRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFuelLogs().then(setLogs).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="py-16 text-center text-sm font-light text-white/25">불러오는 중...</p>
  }

  const totalAmount = logs.reduce((s, l) => s + l.amount, 0)

  return (
    <div className="flex flex-col gap-4 pb-36">

      {/* 그래프 */}
      <FuelAreaChart logs={logs} />

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: '총 주유 금액', value: `${totalAmount.toLocaleString()}원` },
          { label: '총 주유 횟수', value: `${logs.length}회` },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-1 rounded-3xl bg-[#161B26]/60 p-4 backdrop-blur-xl">
            <span className="text-[10px] font-light uppercase tracking-widest text-white/30">{label}</span>
            <span className="text-xl font-bold text-teal-400">{value}</span>
          </div>
        ))}
      </div>

      {/* 타임라인 */}
      {logs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16">
          <Fuel size={28} strokeWidth={1.5} className="text-white/15" />
          <p className="text-sm font-light text-white/25">아직 주유 기록이 없어요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {logs.map((log) => <FuelItem key={log.id} log={log} />)}
        </div>
      )}
    </div>
  )
}
