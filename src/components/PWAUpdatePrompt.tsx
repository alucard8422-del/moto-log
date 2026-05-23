import { useRegisterSW } from 'virtual:pwa-register/react'

export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-2xl px-4 py-3 shadow-xl">
      <span className="text-sm text-white/80">새 버전이 있습니다</span>
      <button
        onClick={() => updateServiceWorker(true)}
        className="text-sm font-semibold text-[#FF5A00] hover:opacity-80"
      >
        업데이트
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        className="text-sm text-white/40 hover:opacity-80"
      >
        닫기
      </button>
    </div>
  )
}
