// useModalBackButton.ts
// 모달이 열려 있을 때 Android 뒤로가기(popstate)를 가로채 모달을 닫아줌.
// 모달이 정상 닫힐 때(X 버튼 등)는 history.back()으로 센티넬을 소비.

import { useEffect, useRef } from 'react'

export function useModalBackButton(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen) return

    // 모달 열릴 때 센티넬 상태를 history 스택에 쌓음
    window.history.pushState({ motoModal: true }, '')

    const onPop = () => {
      // 뒤로가기로 센티넬이 소비됨 → 모달 닫기
      onCloseRef.current()
    }
    window.addEventListener('popstate', onPop)

    return () => {
      window.removeEventListener('popstate', onPop)
      // X 버튼 등 정상 닫기 → 센티넬이 아직 스택에 있으면 소비
      if (window.history.state?.motoModal) {
        window.history.back()
      }
    }
  }, [isOpen])
}
