import { AGENTS } from "../../data/agents";
import { darkMetalMaterial, darkWoodMaterial } from "../materials";
import TableTennis from "./TableTennis";

interface BedProps {
  position: [number, number, number];
  rotationY: number;
  color: string;
}

const BED_WIDTH = 1.0;
const BED_LENGTH = 2.0;

/** A real bed — frame, headboard, mattress, pillow, and a color-coded blanket (one per agent,
 * same identity-color language as the workstations and meeting seats). Local +Z is the "foot"
 * direction, so rotationY follows the same forward-vector convention used everywhere else in
 * the office. */
function Bed({ position, rotationY, color }: BedProps) {
  const halfW = BED_WIDTH / 2;
  const halfL = BED_LENGTH / 2;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Frame */}
      <mesh castShadow receiveShadow position={[0, 0.15, 0]} material={darkWoodMaterial}>
        <boxGeometry args={[BED_WIDTH, 0.28, BED_LENGTH]} />
      </mesh>
      {/* Headboard */}
      <mesh castShadow receiveShadow position={[0, 0.55, -halfL + 0.03]} material={darkWoodMaterial}>
        <boxGeometry args={[BED_WIDTH + 0.08, 0.6, 0.06]} />
      </mesh>
      {/* Mattress */}
      <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
        <boxGeometry args={[BED_WIDTH - 0.08, 0.14, BED_LENGTH - 0.1]} />
        <meshStandardMaterial color="#f2ede1" roughness={0.9} />
      </mesh>
      {/* Pillow */}
      <mesh castShadow position={[0, 0.45, -halfL + 0.3]}>
        <boxGeometry args={[BED_WIDTH - 0.28, 0.1, 0.3]} />
        <meshStandardMaterial color="#ffffff" roughness={0.85} />
      </mesh>
      {/* Blanket — the agent's identity color */}
      <mesh castShadow position={[0, 0.44, 0.15]}>
        <boxGeometry args={[BED_WIDTH - 0.1, 0.06, BED_LENGTH - 0.55]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* Legs */}
      {[
        [-halfW + 0.06, -halfL + 0.06],
        [halfW - 0.06, -halfL + 0.06],
        [-halfW + 0.06, halfL - 0.06],
        [halfW - 0.06, halfL - 0.06],
      ].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, 0.04, z]} material={darkMetalMaterial}>
          <cylinderGeometry args={[0.03, 0.03, 0.08, 8]} />
        </mesh>
      ))}
    </group>
  );
}

// Two facing columns of three, same layout language as the workstation room — one bed per
// agent, color-matched to that agent's identity color.
const COLUMN_A_X = 10;
const COLUMN_B_X = 16;
const ROW_Z = [5, 1.5, -1.5];

/**
 * A rest area filling the space the right-side workstations left behind — six real beds (one
 * per agent), a table-tennis table in the walkway between them, a rug, and soft lighting.
 * Deliberately left open (no enclosing walls) so the wide floor this area was cleared to make
 * stays open, per the redesign brief.
 */
export default function RestRoom() {
  return (
    <group>
      {/* Rug under the whole rest area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[13, 0.005, 1.75]} receiveShadow>
        <planeGeometry args={[9.5, 9]} />
        <meshStandardMaterial color="#2e2540" roughness={0.95} metalness={0} />
      </mesh>

      {ROW_Z.map((z, i) => (
        <Bed key={`a-${z}`} position={[COLUMN_A_X, 0, z]} rotationY={Math.PI / 2} color={AGENTS[i].color} />
      ))}
      {ROW_Z.map((z, i) => (
        <Bed key={`b-${z}`} position={[COLUMN_B_X, 0, z]} rotationY={-Math.PI / 2} color={AGENTS[i + 3].color} />
      ))}

      {/* Table tennis, in the walkway between the two bed columns (X 11-15 is clear —
          Column A's beds end at X=11, Column B's start at X=15) */}
      <TableTennis position={[13, 0, 1.75]} />

      {/* Soft warm lighting over the rest area */}
      <pointLight position={[13, 2.8, 5]} intensity={4} distance={8} color="#ffd9a8" />
      <pointLight position={[13, 2.8, -1.5]} intensity={4} distance={8} color="#ffd9a8" />
    </group>
  );
}
