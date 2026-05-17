/// <reference types="vite/client" />

// 이미지 에셋 모듈 타입 선언 — PNG·JPG·SVG·WEBP import 가능하게 처리
declare module '*.png'  { const src: string; export default src }
declare module '*.jpg'  { const src: string; export default src }
declare module '*.jpeg' { const src: string; export default src }
declare module '*.webp' { const src: string; export default src }
declare module '*.gif'  { const src: string; export default src }
declare module '*.svg'  { const src: string; export default src }
