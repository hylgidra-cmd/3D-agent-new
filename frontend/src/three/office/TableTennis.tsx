import { darkMetalMaterial } from "../materials";

export interface TableTennisProps {
  position: [number, number, number];
  rotationY?: number;
}

const TABLE_WIDTH = 1.5;
const TABLE_LENGTH = 2.7;
const TABLE_HEIGHT = 0.76;

/** A real table-tennis table — playing surface with center/side lines, a net, folding-leg
 * frame, and a couple of paddles + a ball resting on top. */
export default function TableTennis({ position, rotationY = 0 }: TableTennisProps) {
  const halfW = TABLE_WIDTH / 2;
  const halfL = TABLE_LENGTH / 2;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Playing surface */}
      <mesh castShadow receiveShadow position={[0, TABLE_HEIGHT, 0]}>
        <boxGeometry args={[TABLE_WIDTH, 0.04, TABLE_LENGTH]} />
        <meshStandardMaterial color="#1c5fa8" roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Court lines */}
      <mesh position={[0, TABLE_HEIGHT + 0.021, 0]}>
        <boxGeometry args={[0.02, 0.001, TABLE_LENGTH - 0.06]} />
        <meshStandardMaterial color="#f4f6f8" roughness={0.5} />
      </mesh>
      {[-halfW + 0.03, halfW - 0.03].map((x) => (
        <mesh key={x} position={[x, TABLE_HEIGHT + 0.021, 0]}>
          <boxGeometry args={[0.02, 0.001, TABLE_LENGTH - 0.06]} />
          <meshStandardMaterial color="#f4f6f8" roughness={0.5} />
        </mesh>
      ))}

      {/* Net */}
      <mesh position={[0, TABLE_HEIGHT + 0.09, 0]}>
        <boxGeometry args={[TABLE_WIDTH + 0.04, 0.18, 0.012]} />
        <meshStandardMaterial color="#e8ecef" roughness={0.6} transparent opacity={0.75} />
      </mesh>
      <mesh position={[-halfW - 0.02, TABLE_HEIGHT + 0.09, 0]} material={darkMetalMaterial}>
        <cylinderGeometry args={[0.012, 0.012, 0.2, 8]} />
      </mesh>
      <mesh position={[halfW + 0.02, TABLE_HEIGHT + 0.09, 0]} material={darkMetalMaterial}>
        <cylinderGeometry args={[0.012, 0.012, 0.2, 8]} />
      </mesh>

      {/* Folding-leg frame */}
      {[-halfL + 0.25, halfL - 0.25].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh castShadow receiveShadow position={[-halfW + 0.15, TABLE_HEIGHT / 2, 0]} material={darkMetalMaterial}>
            <boxGeometry args={[0.06, TABLE_HEIGHT, 0.06]} />
          </mesh>
          <mesh castShadow receiveShadow position={[halfW - 0.15, TABLE_HEIGHT / 2, 0]} material={darkMetalMaterial}>
            <boxGeometry args={[0.06, TABLE_HEIGHT, 0.06]} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, TABLE_HEIGHT - 0.08, 0]} material={darkMetalMaterial}>
            <boxGeometry args={[TABLE_WIDTH - 0.1, 0.05, 0.05]} />
          </mesh>
        </group>
      ))}
      <mesh castShadow receiveShadow position={[0, 0.06, 0]} material={darkMetalMaterial}>
        <boxGeometry args={[0.05, 0.05, TABLE_LENGTH - 0.5]} />
      </mesh>

      {/* A couple of paddles + a ball, resting on the table */}
      <group position={[-0.4, TABLE_HEIGHT + 0.035, 0.7]} rotation={[0, 0.3, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.012, 16]} />
          <meshStandardMaterial color="#dc2626" roughness={0.4} />
        </mesh>
        <mesh castShadow position={[0, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.12, 8]} />
          <meshStandardMaterial color="#3f2a1c" roughness={0.6} />
        </mesh>
      </group>
      <group position={[0.45, TABLE_HEIGHT + 0.035, -0.6]} rotation={[0, -0.5, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.012, 16]} />
          <meshStandardMaterial color="#111827" roughness={0.4} />
        </mesh>
        <mesh castShadow position={[0, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.12, 8]} />
          <meshStandardMaterial color="#3f2a1c" roughness={0.6} />
        </mesh>
      </group>
      <mesh castShadow position={[0.1, TABLE_HEIGHT + 0.035, 0.1]}>
        <sphereGeometry args={[0.02, 10, 10]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
    </group>
  );
}
