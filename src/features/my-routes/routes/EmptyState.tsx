// EmptyState.tsx — 내 경로 > 기록 없을 때
import { MapPin } from 'lucide-react'

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 px-8 pb-8 pt-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft">
        <MapPin size={32} strokeWidth={1.2} style={{ color: 'var(--brand-muted)' }} />
      </div>
      <div>
        <p className="mb-1.5 text-[15px] font-bold text-main">아직 기록된 경로가 없어요</p>
        <p className="text-[13px] leading-relaxed text-muted">
          지도 탭에서 주행을 마치면<br />여기에 경로가 저장돼요.
        </p>
      </div>
    </div>
  )
}
