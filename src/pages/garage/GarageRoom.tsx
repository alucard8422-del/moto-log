// GarageRoom.tsx — 전시관 스타일 화이트 룸
// 수정 시 이 파일만 건드리면 됩니다.

export default function GarageRoom() {
  return (
    <group>
      {/* ── 바닥 — 연한 그레이 화이트 ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#ECEEF2" roughness={0.9} metalness={0} />
      </mesh>

      {/* ── 뒷벽 ── */}
      <mesh position={[0, 3, -6]} receiveShadow>
        <planeGeometry args={[16, 6]} />
        <meshStandardMaterial color="#F4F5F7" roughness={1} />
      </mesh>

      {/* ── 좌벽 ── */}
      <mesh position={[-6, 3, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[16, 6]} />
        <meshStandardMaterial color="#F4F5F7" roughness={1} />
      </mesh>

      {/* ── 우벽 ── */}
      <mesh position={[6, 3, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[16, 6]} />
        <meshStandardMaterial color="#F4F5F7" roughness={1} />
      </mesh>

      {/* ── 바이크 스탠드 받침 (밝은 톤) ── */}
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <boxGeometry args={[2.0, 0.03, 0.7]} />
        <meshStandardMaterial color="#D8DCE4" metalness={0.15} roughness={0.75} />
      </mesh>
    </group>
  )
}
