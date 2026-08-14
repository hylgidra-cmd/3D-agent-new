import { darkMetalMaterial } from "../materials";

interface PendantLightProps {
  position: [number, number, number];
  intensity?: number;
}

/** One hanging pendant fixture — cable, shade, and a warm point light. Reused across the
 * workstation wings and the plaza so the office reads as professionally lit rather than lit
 * only by ambient/directional fill (item 11: "ceiling lights, hanging lights, warm
 * professional office lighting"). */
function PendantLight({ position, intensity = 5.5 }: PendantLightProps) {
  const [x, y, z] = position;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, y + 0.5, 0]} material={darkMetalMaterial}>
        <cylinderGeometry args={[0.008, 0.008, 1, 6]} />
      </mesh>
      <mesh castShadow position={[0, y, 0]} material={darkMetalMaterial}>
        <coneGeometry args={[0.22, 0.16, 16, 1, true]} />
      </mesh>
      <mesh position={[0, y - 0.06, 0]}>
        <sphereGeometry args={[0.06, 10, 10]} />
        <meshStandardMaterial color="#ffe3ba" emissive="#ffe3ba" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      <pointLight position={[0, y - 0.06, 0]} intensity={intensity} distance={7.5} color="#ffe3ba" decay={2} />
    </group>
  );
}

const WING_LIGHT_HEIGHT = 3.05;
const PLAZA_LIGHT_HEIGHT = 3.15;

/** Fixed placements over each workstation and the open plaza — real fixtures the ambient/key
 * light alone couldn't provide, giving every desk its own pool of warm light. Column positions
 * match the shared workstation room's two facing desk columns (see data/agents.ts's
 * WAYPOINTS/floor-plan comment). */
export default function CeilingLights() {
  const rowZ = [6, 1, -4];

  return (
    <group>
      {rowZ.map((z) => (
        <PendantLight key={`col-a-${z}`} position={[-16, WING_LIGHT_HEIGHT, z]} />
      ))}
      {rowZ.map((z) => (
        <PendantLight key={`col-b-${z}`} position={[-9, WING_LIGHT_HEIGHT, z]} />
      ))}

      <PendantLight position={[-4.5, PLAZA_LIGHT_HEIGHT, 3]} intensity={4} />
      <PendantLight position={[4.5, PLAZA_LIGHT_HEIGHT, 3]} intensity={4} />
    </group>
  );
}
