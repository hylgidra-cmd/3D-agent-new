import { darkMetalMaterial } from "../materials";

export interface ChairProps {
  /** Local position within the parent Workstation group. */
  position: [number, number, number];
  rotationY?: number;
  seatColor?: string;
}

/**
 * A real office chair — seat, backrest, two armrests, and a 5-point wheeled base — replacing
 * the old single-pole placeholder. Proportioned so an agent sitting here (their own seated pose
 * lowers their hips ~0.52 world units, see AgentCharacter) roughly lines up with the seat top.
 */
export default function Chair({ position, rotationY = 0, seatColor = "#20252e" }: ChairProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Seat cushion */}
      <mesh castShadow receiveShadow position={[0, 0.47, 0]}>
        <boxGeometry args={[0.52, 0.09, 0.5]} />
        <meshStandardMaterial color={seatColor} roughness={0.55} metalness={0.1} />
      </mesh>

      {/* Backrest, slightly reclined */}
      <mesh castShadow receiveShadow position={[0, 0.82, -0.24]} rotation={[-0.12, 0, 0]}>
        <boxGeometry args={[0.5, 0.6, 0.08]} />
        <meshStandardMaterial color={seatColor} roughness={0.55} metalness={0.1} />
      </mesh>

      {/* Armrests */}
      <mesh castShadow receiveShadow position={[-0.29, 0.62, -0.02]}>
        <boxGeometry args={[0.06, 0.06, 0.32]} />
        <meshStandardMaterial color="#15181e" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh castShadow receiveShadow position={[-0.29, 0.5, -0.02]} material={darkMetalMaterial}>
        <boxGeometry args={[0.05, 0.22, 0.05]} />
      </mesh>
      <mesh castShadow receiveShadow position={[0.29, 0.62, -0.02]}>
        <boxGeometry args={[0.06, 0.06, 0.32]} />
        <meshStandardMaterial color="#15181e" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh castShadow receiveShadow position={[0.29, 0.5, -0.02]} material={darkMetalMaterial}>
        <boxGeometry args={[0.05, 0.22, 0.05]} />
      </mesh>

      {/* Gas-lift column */}
      <mesh castShadow receiveShadow position={[0, 0.32, 0]} material={darkMetalMaterial}>
        <cylinderGeometry args={[0.035, 0.045, 0.32, 10]} />
      </mesh>

      {/* 5-point wheeled base */}
      <mesh castShadow receiveShadow position={[0, 0.14, 0]} material={darkMetalMaterial}>
        <cylinderGeometry args={[0.03, 0.03, 0.04, 10]} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => {
        const angle = (i / 5) * Math.PI * 2;
        const x = Math.cos(angle) * 0.26;
        const z = Math.sin(angle) * 0.26;
        return (
          <group key={i} position={[x, 0.06, z]} rotation={[0, -angle, 0]}>
            <mesh castShadow receiveShadow material={darkMetalMaterial}>
              <boxGeometry args={[0.28, 0.03, 0.04]} />
            </mesh>
            <mesh castShadow receiveShadow position={[0.12, -0.03, 0]}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshStandardMaterial color="#0d0f13" roughness={0.6} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
