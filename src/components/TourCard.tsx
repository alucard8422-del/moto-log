interface TourCardData {
  id: string
  title: string
  region: string
  imageUrl?: string
  mood: '여유로운' | '감성적인' | '도전적인'
  distanceKm: number
  description?: string
  tags?: string[]
}

interface TourCardProps {
  card: TourCardData
  tall?: boolean
  onPress?: (card: TourCardData) => void
}

const MOOD_COLOR: Record<TourCardData['mood'], string> = {
  '여유로운': 'bg-emerald-400/20 text-emerald-300',
  '감성적인': 'bg-violet-400/20 text-violet-300',
  '도전적인': 'bg-rose-400/20 text-rose-300',
}

export type { TourCardData }

export default function TourCard({ card, tall = false, onPress }: TourCardProps) {
  return (
    <button
      onClick={() => {
        console.log('[TourCard] 코스 선택:', card.id, card.title)
        onPress?.(card)
      }}
      className={`group relative w-full overflow-hidden rounded-3xl ${tall ? 'h-72' : 'h-52'} transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]`}
    >
      {/* 배경 이미지 or 플레이스홀더 */}
      {card.imageUrl ? (
        <img
          src={card.imageUrl}
          alt={card.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-slate-800">
          <svg className="h-full w-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`g-${card.id}`} width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#g-${card.id})`} />
          </svg>
        </div>
      )}

      {/* 하단 그라데이션 */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

      {/* 상단 무드 배지 */}
      <div className="absolute left-3 top-3">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-light backdrop-blur-sm ${MOOD_COLOR[card.mood]}`}>
          {card.mood}
        </span>
      </div>

      {/* 하단 텍스트 */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-left text-sm font-bold leading-snug text-white">
          {card.title}
        </p>
        <p className="mt-1 text-left text-[11px] font-light text-white/50">
          {card.region} · {card.distanceKm}km
        </p>
      </div>
    </button>
  )
}
