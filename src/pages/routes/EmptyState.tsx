// EmptyState.tsx — 내 경로 > 기록 없을 때 빈 화면
import { Flag } from 'lucide-react'

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 px-8 pt-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
        <Flag size={32} strokeWidth={1.5} className="text-white/15" />
      </div>
      <p className="text-sm font-bold text-white/40">아직 기록된 경로가 없어요</p>
      <p className="text-xs font-light text-white/20">
        지도 탭에서 주행을 마치면<br />여기에 경로가 저장돼요.
      </p>
    </div>
  )
}
