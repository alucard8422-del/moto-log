// SavedCoursesPage.tsx — 북마크한 코스 모음집
import { Bookmark } from 'lucide-react'

export default function SavedCoursesPage() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-5 pb-32">
      <div>
        <p className="text-xs font-light text-white/30">내가 저장한 코스</p>
        <h2 className="text-xl font-bold text-white">저장 장소</h2>
      </div>

      <div className="flex flex-col items-center justify-center gap-5 pt-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
          <Bookmark size={32} strokeWidth={1.5} className="text-white/15" />
        </div>
        <p className="text-sm font-bold text-white/40">저장한 코스가 없어요</p>
        <p className="text-xs font-light text-white/20">
          추천 코스 상세 팝업에서 🔖 버튼을 누르면<br />여기에 모입니다
        </p>
      </div>
    </div>
  )
}
