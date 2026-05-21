// useBodyScrollLock.ts
// 모달/시트가 열려 있는 동안 body 스크롤을 잠가 배경 페이지가 움직이지 않게 함.

import { useEffect } from 'react'

export function useBodyScrollLock(isLocked: boolean = true) {
  useEffect(() => {
    if (!isLocked) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isLocked])
}
