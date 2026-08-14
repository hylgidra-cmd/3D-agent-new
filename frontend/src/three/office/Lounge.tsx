import { darkMetalMaterial, darkWoodMaterial, metalMaterial, woodMaterial } from "../materials";
import Plant from "./Plant";

/** A two-seat sofa — each half is one of the six lounge break-spot waypoints (see
 * data/agents.ts), with a low center console/armrest between them so it reads as two distinct
 * seats rather than one shared bench. */
function Sofa({ position, rotationY, color }: { position: [number, number, number]; rotationY: number; color: string }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.28, 0]}>
        <boxGeometry args={[1.6, 0.4, 0.7]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.62, -0.3]}>
        <boxGeometry args={[1.6, 0.55, 0.14]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh castShadow receiveShadow position={[-0.75, 0.5, 0]}>
        <boxGeometry args={[0.14, 0.35, 0.7]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh castShadow receiveShadow position={[0.75, 0.5, 0]}>
        <boxGeometry args={[0.14, 0.35, 0.7]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {/* Center console — visually splits the bench into two seats */}
      <mesh castShadow receiveShadow position={[0, 0.46, 0.02]}>
        <boxGeometry args={[0.1, 0.16, 0.5]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
      </mesh>
    </group>
  );
}

/**
 * A combined lounge + kitchen zone. The lounge's three two-seat sofas ARE the six Break
 * destinations (see data/agents.ts's "lounge-1".."lounge-6" waypoints) — every agent gets its
 * own real seat in the same room on Break, rather than being scattered across separate spots.
 * The kitchen alongside it is just a believable modern-startup detail, not itself a waypoint.
 */
export default function Lounge() {
  return (
    <group>
      {/* ── Lounge — sofas A/B/C double as the six "lounge-1".."lounge-6" waypoints ── */}
      <group position={[11, 0, -6]}>
        {/* Rug under the whole seating group — real flooring material, not a color tag */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0.3]} receiveShadow>
          <planeGeometry args={[4.2, 3.6]} />
          <meshStandardMaterial color="#4b3527" roughness={0.95} metalness={0} />
        </mesh>

        <Sofa position={[-1.3, 0, 0]} rotationY={Math.PI / 2} color="#334155" />
        <Sofa position={[1.3, 0, 0]} rotationY={-Math.PI / 2} color="#334155" />
        <Sofa position={[0, 0, 1.5]} rotationY={Math.PI} color="#3f4b63" />

        {/* Console TV, facing the seating group */}
        <group position={[0, 0, -1.7]}>
          <mesh castShadow receiveShadow position={[0, 0.32, 0]} material={darkWoodMaterial}>
            <boxGeometry args={[1.6, 0.5, 0.4]} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 1.05, 0]} material={darkMetalMaterial}>
            <boxGeometry args={[1.5, 0.85, 0.05]} />
          </mesh>
          <mesh position={[0, 1.05, 0.027]}>
            <boxGeometry args={[1.4, 0.75, 0.01]} />
            <meshStandardMaterial color="#1a2233" emissive="#38bdf8" emissiveIntensity={0.25} toneMapped={false} />
          </mesh>
        </group>

        {/* Bookshelf */}
        <group position={[-2.5, 0, 0.4]} rotation={[0, Math.PI / 2, 0]}>
          <mesh castShadow receiveShadow material={darkWoodMaterial}>
            <boxGeometry args={[1.4, 1.9, 0.28]} />
          </mesh>
          {[0.5, 0.95, 1.4].map((y, shelfIndex) => {
            const bookColors = ["#f87171", "#facc15", "#4ade80", "#38bdf8", "#a78bfa"];
            return (
              <group key={shelfIndex} position={[0, y, 0.08]}>
                {bookColors.map((c, i) => (
                  <mesh key={c} castShadow position={[-0.55 + i * 0.13, 0.09, 0]}>
                    <boxGeometry args={[0.045, 0.18 + (i % 2) * 0.03, 0.16]} />
                    <meshStandardMaterial color={c} roughness={0.7} />
                  </mesh>
                ))}
              </group>
            );
          })}
        </group>

        <mesh castShadow receiveShadow position={[0, 0.22, 0]} material={darkWoodMaterial}>
          <boxGeometry args={[1.1, 0.06, 0.6]} />
        </mesh>
        <mesh castShadow receiveShadow position={[-0.45, 0.1, 0.22]} material={darkMetalMaterial}>
          <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
        </mesh>
        <mesh castShadow receiveShadow position={[0.45, 0.1, 0.22]} material={darkMetalMaterial}>
          <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
        </mesh>
        <mesh castShadow receiveShadow position={[-0.45, 0.1, -0.22]} material={darkMetalMaterial}>
          <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
        </mesh>
        <mesh castShadow receiveShadow position={[0.45, 0.1, -0.22]} material={darkMetalMaterial}>
          <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
        </mesh>

        {/* Pendant lights over the lounge */}
        <pointLight position={[0, 2.6, 0]} intensity={5} distance={7} color="#ffcf9e" />
        <mesh position={[0, 2.9, 0]}>
          <sphereGeometry args={[0.12, 10, 10]} />
          <meshStandardMaterial color="#ffcf9e" emissive="#ffcf9e" emissiveIntensity={1.4} toneMapped={false} />
        </mesh>

        <Plant position={[-2.2, 0, -1.2]} scale={1.1} />
        <Plant position={[2.2, 0, 1.2]} scale={1.1} />
      </group>

      {/* ── Kitchen — decorative detail only, not a Break destination anymore ── */}
      <group position={[15.5, 0, -11]}>
        {/* Counter run */}
        <mesh castShadow receiveShadow position={[0, 0.45, 0]} material={woodMaterial}>
          <boxGeometry args={[3.4, 0.9, 0.7]} />
        </mesh>
        <mesh position={[0, 0.92, 0]}>
          <boxGeometry args={[3.4, 0.04, 0.7]} />
          <meshStandardMaterial color="#e8ecef" roughness={0.2} metalness={0.1} />
        </mesh>

        {/* Cabinets above */}
        <mesh castShadow receiveShadow position={[-1, 1.7, -0.3]} material={darkWoodMaterial}>
          <boxGeometry args={[1.3, 0.6, 0.4]} />
        </mesh>
        <mesh castShadow receiveShadow position={[1, 1.7, -0.3]} material={darkWoodMaterial}>
          <boxGeometry args={[1.3, 0.6, 0.4]} />
        </mesh>

        {/* Fridge */}
        <mesh castShadow receiveShadow position={[-2.1, 0.9, 0]} material={metalMaterial}>
          <boxGeometry args={[0.8, 1.8, 0.75]} />
        </mesh>
        <mesh position={[-1.68, 1.3, 0.38]}>
          <boxGeometry args={[0.03, 0.5, 0.03]} />
          <meshStandardMaterial color="#0d1015" />
        </mesh>

        {/* Coffee machine on the counter */}
        <group position={[1.4, 0.94, 0]}>
          <mesh castShadow receiveShadow material={darkMetalMaterial}>
            <boxGeometry args={[0.32, 0.36, 0.28]} />
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <boxGeometry args={[0.06, 0.1, 0.06]} />
            <meshStandardMaterial color="#f87171" emissive="#f87171" emissiveIntensity={1} />
          </mesh>
        </group>

        {/* Small kitchen table + stools */}
        <mesh castShadow receiveShadow position={[0, 0.5, 1.6]} material={darkWoodMaterial}>
          <cylinderGeometry args={[0.5, 0.5, 0.06, 16]} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.25, 1.6]} material={darkMetalMaterial}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 10]} />
        </mesh>
        {[0, 1, 2].map((i) => {
          const angle = (i / 3) * Math.PI * 2;
          const x = Math.cos(angle) * 0.85;
          const z = 1.6 + Math.sin(angle) * 0.85;
          return (
            <mesh key={i} castShadow receiveShadow position={[x, 0.32, z]}>
              <cylinderGeometry args={[0.16, 0.16, 0.06, 12]} />
              <meshStandardMaterial color="#2a3340" roughness={0.5} />
            </mesh>
          );
        })}

        <pointLight position={[0, 2.3, 0.5]} intensity={4} distance={6} color="#fff2e0" />
      </group>
    </group>
  );
}
