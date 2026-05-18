// GarageRoom.tsx — 가라지 방 지오메트리 (바닥 / 벽 / 네온 조명)
// 수정 시 이 파일만 건드리면 됩니다.

export default function GarageRoom() {
  return (
    <group>
      {/* ── 바닥 ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#0A1220" metalness={0.4} roughness={0.6} />
      </mesh>

      {/* ── 바닥 반사선 (타일 느낌) ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <planeGeometry args={[1.8, 4]} />
        <meshStandardMaterial color="#2DD4BF" transparent opacity={0.04} />
      </mesh>

      {/* ── 뒷벽 ── */}
      <mesh position={[0, 2.5, -5]} receiveShadow>
        <planeGeometry args={[12, 5]} />
        <meshStandardMaterial color="#0D1828" />
      </mesh>

      {/* ── 좌벽 ── */}
      <mesh position={[-5, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[12, 5]} />
        <meshStandardMaterial color="#0D1828" />
      </mesh>

      {/* ── 우벽 ── */}
      <mesh position={[5, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[12, 5]} />
        <meshStandardMaterial color="#0D1828" />
      </mesh>

      {/* ── 천장 네온 스트립 (teal) ── */}
      <mesh position={[0, 4.8, -1]}>
        <boxGeometry args={[3.5, 0.05, 0.12]} />
        <meshStandardMaterial
          color="#2DD4BF"
          emissive="#2DD4BF"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
      {/* 네온 광원 */}
      <pointLight
        position={[0, 4.5, -1]}
        intensity={2}
        color="#2DD4BF"
        distance={10}
        decay={2}
      />

      {/* ── 벽 선반 ── */}
      <mesh position={[-4.9, 2.2, -1]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[1.5, 0.06, 0.3]} />
        <meshStandardMaterial color="#1E293B" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* ── 바이크 스탠드 받침 ── */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[1.8, 0.04, 0.6]} />
        <meshStandardMaterial color="#1E293B" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  )
}
