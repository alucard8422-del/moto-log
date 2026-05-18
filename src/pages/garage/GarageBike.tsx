// GarageBike.tsx — 바이크 3D 모델
// 현재: Three.js 도형 기반 플레이스홀더
// 나중에 실제 GLB 모델로 교체할 파일입니다. 이 파일만 수정하면 됩니다.

export default function GarageBike() {
  return (
    <group position={[0, 0, 0]} rotation={[0, Math.PI / 8, 0]}>

      {/* ── 뒷바퀴 ── */}
      <mesh position={[-0.75, 0.36, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.36, 0.09, 16, 40]} />
        <meshStandardMaterial color="#111827" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* 뒷바퀴 휠 */}
      <mesh position={[-0.75, 0.36, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.06, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* ── 앞바퀴 ── */}
      <mesh position={[0.78, 0.36, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.36, 0.09, 16, 40]} />
        <meshStandardMaterial color="#111827" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* 앞바퀴 휠 */}
      <mesh position={[0.78, 0.36, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.06, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* ── 메인 프레임 / 차체 ── */}
      <mesh position={[0, 0.68, 0]} castShadow>
        <boxGeometry args={[1.3, 0.28, 0.32]} />
        <meshStandardMaterial color="#2DD4BF" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* ── 연료 탱크 ── */}
      <mesh position={[0.1, 0.88, 0]} castShadow>
        <boxGeometry args={[0.55, 0.22, 0.3]} />
        <meshStandardMaterial color="#2DD4BF" metalness={0.6} roughness={0.2} />
      </mesh>

      {/* ── 시트 ── */}
      <mesh position={[-0.3, 0.9, 0]} castShadow>
        <boxGeometry args={[0.55, 0.1, 0.26]} />
        <meshStandardMaterial color="#1E293B" roughness={0.95} />
      </mesh>

      {/* ── 엔진 블록 ── */}
      <mesh position={[0.05, 0.48, 0]} castShadow>
        <boxGeometry args={[0.38, 0.32, 0.34]} />
        <meshStandardMaterial color="#334155" metalness={0.75} roughness={0.35} />
      </mesh>

      {/* ── 앞 포크 (서스펜션) ── */}
      <mesh position={[0.72, 0.62, 0]} rotation={[0, 0, -0.15]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.55, 8]} />
        <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* ── 핸들바 ── */}
      <mesh position={[0.6, 0.98, 0]} castShadow>
        <boxGeometry args={[0.08, 0.06, 0.6]} />
        <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* ── 머플러 ── */}
      <mesh position={[-0.3, 0.28, 0.2]} rotation={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.055, 0.7, 12]} rotation={[0, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#64748B" metalness={0.85} roughness={0.15} />
      </mesh>

      {/* ── 헤드라이트 ── */}
      <mesh position={[0.88, 0.8, 0]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive="#FFFFFF"
          emissiveIntensity={0.4}
          toneMapped={false}
        />
      </mesh>
      <pointLight position={[1.1, 0.8, 0]} intensity={0.5} color="#FFFFFF" distance={3} />
    </group>
  )
}
