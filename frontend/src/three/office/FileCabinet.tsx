import { darkMetalMaterial, metalMaterial } from "../materials";

export interface FileCabinetProps {
  position: [number, number, number];
  rotationY?: number;
}

/** A small 3-drawer file cabinet — cheap interior-filling prop for wall lines that would
 * otherwise read as empty (wing ends, meeting-room corners, reception flank). */
export default function FileCabinet({ position, rotationY = 0 }: FileCabinetProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.55, 0]} material={metalMaterial}>
        <boxGeometry args={[0.5, 1.1, 0.55]} />
      </mesh>
      {[0.85, 0.55, 0.25].map((y, i) => (
        <group key={i} position={[0, y, 0.28]}>
          <mesh castShadow position={[0, 0, 0]} material={darkMetalMaterial}>
            <boxGeometry args={[0.44, 0.24, 0.02]} />
          </mesh>
          <mesh position={[0, 0, 0.012]}>
            <boxGeometry args={[0.14, 0.025, 0.015]} />
            <meshStandardMaterial color="#8b93a1" roughness={0.3} metalness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
