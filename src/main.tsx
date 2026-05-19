import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 모바일 브라우저 핀치줌(2손가락 확대) 차단
// iOS Safari는 viewport user-scalable=no를 무시하므로 JS로 직접 막아야 함
// e.preventDefault()로 브라우저 기본 줌만 차단, Mapbox 자체 줌은 정상 동작
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault()
}, { passive: false })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
