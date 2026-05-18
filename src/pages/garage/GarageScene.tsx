// GarageScene.tsx — R3F Canvas + 조명 + OrbitControls
// 카메라 위치·조명 조정은 이 파일에서

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense } from 'react'
import GarageRoom from './GarageRoom'
import GarageBike from './GarageBike'

export default function GarageScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [3, 2, 3.5], fov: 48 }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      gl={{ antialias: true }}
    >
      {/* ── 기본 조명 ── */}
      <ambientLight intensity={0.25} />

      {/* ── 메인 스팟 (천장 정중앙) ── */}
      <spotLight
        position={[0, 5, 0]}
        intensity={3}
        angle={0.55}
        penumbra={0.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
        color="#E2E8F0"
      />

      {/* ── 보조 포인트라이트 (앞쪽 fill) ── */}
      <pointLight position={[3, 3, 4]} intensity={0.6} color="#E2E8F0" />

      {/* ── 씬 ── */}
      <Suspense fallback={null}>
        <GarageRoom />
        <GarageBike />
      </Suspense>

      {/* ── 터치/드래그 회전 컨트롤 ── */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minPolarAngle={Math.PI / 6}   // 위에서 내려보는 최대 각도
        maxPolarAngle={Math.PI / 2.2} // 바닥 아래로 내려가지 않도록
        minDistance={2.5}
        maxDistance={7}
        target={[0, 0.6, 0]}          // 바이크 중심 바라보기
        dampingFactor={0.08}
        enableDamping
      />
    </Canvas>
  )
}
