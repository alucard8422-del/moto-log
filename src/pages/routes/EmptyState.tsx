// EmptyState.tsx — 내 경로 > 기록 없을 때
import { MapPin } from 'lucide-react'

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-8 pt-16 pb-8 text-center">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: '#FFF3E8' }}
      >
        <MapPin size={32} strokeWidth={1.2} style={{ color: '#FDBA74' }} />
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#1C0A00', marginBottom: 6 }}>
          아직 기록된 경로가 없어요
        </p>
        <p style={{ fontSize: 13, color: '#A8A29E', lineHeight: 1.7 }}>
          지도 탭에서 주행을 마치면<br />여기에 경로가 저장돼요.
        </p>
      </div>
    </div>
  )
}
