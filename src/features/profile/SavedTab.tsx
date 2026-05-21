// SavedTab.tsx — 프로필 > 저장한 코스 탭
// 저장 코스 UI 수정 시 이 파일만 건드리면 됩니다.

import { Bookmark } from 'lucide-react'

export default function SavedTab() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 pt-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
        <Bookmark size={32} strokeWidth={1.5} className="text-white/15" />
      </div>
      <p className="text-sm font-bold text-white/40">저장한 코스가 없어요</p>
      <p className="text-xs font-light text-white/20">
        추천 코스 상세 팝업에서 🔖 버튼을 누르면<br />여기에 모입니다
      </p>
    </div>
  )
}
