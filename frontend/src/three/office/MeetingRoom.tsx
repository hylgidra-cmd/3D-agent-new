import { WAYPOINTS } from "../../data/agents";
import { concreteMaterial, darkMetalMaterial, darkWoodMaterial } from "../materials";
import Plant from "./Plant";

const SEAT_IDS = [
  "meeting-seat-1",
  "meeting-seat-2",
  "meeting-seat-3",
  "meeting-seat-4",
  "meeting-seat-5",
  "meeting-seat-6",
] as const;

/** A chair at a meeting-table seat. Backrest sits at local -Z, which — because this group
 * shares the exact rotationY the agent standing here will also use — always lands directly
 * behind whoever's seated, regardless of which side of the table the seat is on. */
function MeetingChair({ position, rotationY }: { position: [number, number, number]; rotationY: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.42, 0]}>
        <boxGeometry args={[0.5, 0.06, 0.5]} />
        <meshStandardMaterial color="#20252e" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.72, -0.22]}>
        <boxGeometry args={[0.5, 0.55, 0.06]} />
        <meshStandardMaterial color="#20252e" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.2, 0]} material={darkMetalMaterial}>
        <cylinderGeometry args={[0.045, 0.045, 0.4, 10]} />
      </mesh>
    </group>
  );
}

/**
 * The meeting room: a two-tone table, six chairs positioned exactly on the same waypoints
 * agents walk to when they join a meeting, a wall-mounted presentation screen, a whiteboard,
 * and low interior partition walls (not the full-height glass perimeter) so the room reads as
 * its own enclosed space while staying open toward the plaza.
 */
export default function MeetingRoom() {
  return (
    <group position={[0, 0, -9]}>
      {/* Interior partitions — back + two sides, open toward the plaza (+Z) as the doorway */}
      <mesh castShadow receiveShadow position={[0, 1.1, -4.5]} material={concreteMaterial}>
        <boxGeometry args={[12, 2.2, 0.2]} />
      </mesh>
      <mesh castShadow receiveShadow position={[-6, 1.1, -1.8]} material={concreteMaterial}>
        <boxGeometry args={[0.2, 2.2, 5.4]} />
      </mesh>
      <mesh castShadow receiveShadow position={[6, 1.1, -1.8]} material={concreteMaterial}>
        <boxGeometry args={[0.2, 2.2, 5.4]} />
      </mesh>

      {/* Rug under the table — a real material transition, not a color-zone tag */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[8.6, 4.6]} />
        <meshStandardMaterial color="#242a38" roughness={0.95} metalness={0} />
      </mesh>

      {/* Table — two-tone: dark wood base + lighter glossy top trim */}
      <mesh castShadow receiveShadow position={[0, 0.7, 0]} material={darkWoodMaterial}>
        <boxGeometry args={[7.2, 0.5, 3.6]} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.97, 0]}>
        <boxGeometry args={[7.4, 0.05, 3.8]} />
        <meshStandardMaterial color="#171b22" roughness={0.15} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.995, 0]}>
        <boxGeometry args={[7.4, 0.01, 3.8]} />
        <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={0.5} />
      </mesh>

      {/* Chairs — exactly at the six meeting-seat waypoints agents walk to. This group is
          positioned at world (0,0,-9), so waypoints (given in world space) need that offset
          subtracted back out to land in the right spot locally. */}
      {SEAT_IDS.map((id) => {
        const wp = WAYPOINTS[id];
        const local: [number, number, number] = [wp.position[0], wp.position[1], wp.position[2] + 9];
        return <MeetingChair key={id} position={local} rotationY={wp.rotationY} />;
      })}

      {/* Presentation screen on the back wall */}
      <mesh castShadow receiveShadow position={[0, 2.0, -4.35]} material={darkMetalMaterial}>
        <boxGeometry args={[3.4, 1.9, 0.06]} />
      </mesh>
      <mesh position={[0, 2.0, -4.31]}>
        <boxGeometry args={[3.1, 1.65, 0.02]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.55} toneMapped={false} />
      </mesh>

      {/* Conference camera, mounted just above the screen */}
      <group position={[0, 3.05, -4.3]}>
        <mesh castShadow receiveShadow material={darkMetalMaterial}>
          <boxGeometry args={[0.32, 0.12, 0.12]} />
        </mesh>
        <mesh position={[0, 0, 0.07]}>
          <circleGeometry args={[0.035, 12]} />
          <meshStandardMaterial color="#0d1015" roughness={0.2} metalness={0.6} />
        </mesh>
        <mesh position={[0.13, 0.03, 0.065]}>
          <circleGeometry args={[0.012, 8]} />
          <meshStandardMaterial color="#f87171" emissive="#f87171" emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
      </group>

      {/* Whiteboard on the side wall */}
      <mesh castShadow receiveShadow position={[-5.9, 1.7, -2.6]} rotation={[0, Math.PI / 2, 0]} material={darkMetalMaterial}>
        <boxGeometry args={[2.6, 1.5, 0.04]} />
      </mesh>
      <mesh position={[-5.86, 1.7, -2.6]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[2.4, 1.3, 0.01]} />
        <meshStandardMaterial color="#f4f6f8" roughness={0.4} />
      </mesh>

      {/* Visible ceiling fixture — not just an invisible light source */}
      <mesh castShadow receiveShadow position={[0, 3.15, 0]} material={darkMetalMaterial}>
        <boxGeometry args={[3.2, 0.08, 0.6]} />
      </mesh>
      <mesh position={[0, 3.1, 0]}>
        <boxGeometry args={[3, 0.02, 0.4]} />
        <meshStandardMaterial color="#fff2e0" emissive="#fff2e0" emissiveIntensity={1.3} toneMapped={false} />
      </mesh>
      <spotLight
        position={[0, 3.15, 0]}
        angle={0.7}
        penumbra={0.6}
        intensity={22}
        distance={9}
        color="#fff2e0"
        castShadow
      />

      <Plant position={[5.4, 0, -3.9]} scale={1.1} />
      <Plant position={[5.4, 0, 0.4]} scale={1.1} />
    </group>
  );
}
