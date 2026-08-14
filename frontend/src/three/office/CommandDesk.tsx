import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, MeshStandardMaterial } from "three";
import { darkMetalMaterial, glassMaterial, stoneMaterial } from "../materials";
import Chair from "./Chair";
import Plant from "./Plant";
import WorkstationSign from "./WorkstationSign";

export interface CommandDeskProps {
  /** The desk's own world position — already offset forward of Natali's waypoint by the same
   * DESK_CHAIR_OFFSET convention every other workstation uses (see OfficeScene's
   * deskTransformFor), so her chair lands exactly on the waypoint. */
  position: [number, number, number];
  rotationY: number;
  accentColor: string;
}

/** A slow, gentle pulse ring on the dais floor — the same "this spot is special" language as
 * Reception's backlit sign, scaled down to a floor accent rather than a wall panel. */
function DaisRing({ accentColor }: { accentColor: string }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const mat = ref.current?.material as MeshStandardMaterial | undefined;
    if (mat) mat.emissiveIntensity = 0.55 + Math.sin(clock.getElapsedTime() * 1.4) * 0.2;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.021, 0]}>
      <ringGeometry args={[1.55, 1.7, 48]} />
      <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.6} toneMapped={false} />
    </mesh>
  );
}

/** A small floating status hologram over the desk — three softly rotating rings, standing in for
 * "she can see the whole team's status at a glance" without literally duplicating ChatPanel's
 * report inside the 3D scene. */
function StatusHologram({ accentColor }: { accentColor: string }) {
  const group = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = clock.getElapsedTime() * 0.6;
  });
  return (
    <group position={[0, 1.15, -0.05]}>
      <mesh ref={group}>
        <torusGeometry args={[0.16, 0.012, 8, 24]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.1} toneMapped={false} transparent opacity={0.85} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.11, 0.008, 8, 24]} />
        <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={0.9} toneMapped={false} transparent opacity={0.75} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * Natali's central command desk — the office's 7th, distinct workstation, deliberately NOT a
 * reskinned Workstation.tsx: a rounded dais instead of a rectangular desk, a floating status
 * hologram instead of flat monitors, graphite + gold instead of any engineering role's accent
 * color, so it reads immediately as "the manager's desk" rather than "one more developer spot".
 * Sits between the workstation room and the meeting room (see data/agents.ts's WAYPOINTS
 * central-desk entry) — genuinely central, not tucked into either wing.
 */
export default function CommandDesk({ position, rotationY, accentColor }: CommandDeskProps) {
  const bulbRef = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const mat = bulbRef.current?.material as MeshStandardMaterial | undefined;
    if (mat) mat.emissiveIntensity = 1.0 + Math.sin(clock.getElapsedTime() * 2.2) * 0.12;
  });

  const glassMat = useMemo(() => glassMaterial, []);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Round stone dais the whole desk sits on — visually separates "the admin's spot" from
          the plain concrete plaza floor around it. */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} material={stoneMaterial}>
        <circleGeometry args={[1.75, 40]} />
      </mesh>
      <DaisRing accentColor={accentColor} />

      {/* Curved-front console desk — a bank of shallow arched panels standing in for a real
          reception-style curved front, rather than Workstation's flat rectangular tabletop. */}
      <mesh castShadow receiveShadow position={[0, 0.72, 0]} material={darkMetalMaterial}>
        <cylinderGeometry args={[0.95, 1.05, 0.08, 32, 1, false, Math.PI * 0.15, Math.PI * 0.7]} />
      </mesh>
      <mesh position={[0, 0.77, -0.35]}>
        <boxGeometry args={[1.5, 0.02, 0.02]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.85} toneMapped={false} />
      </mesh>
      {/* Solid support drum beneath the console top */}
      <mesh castShadow receiveShadow position={[0, 0.36, 0]} material={darkMetalMaterial}>
        <cylinderGeometry args={[0.88, 0.92, 0.72, 32]} />
      </mesh>

      {/* Slim glass display panel, angled toward the chair — her "screen", but a single elegant
          pane rather than a bank of monitors. */}
      <group position={[0, 0.78, -0.55]} rotation={[-0.25, 0, 0]}>
        <mesh castShadow receiveShadow material={darkMetalMaterial}>
          <boxGeometry args={[0.66, 0.4, 0.03]} />
        </mesh>
        <mesh position={[0, 0, 0.018]} material={glassMat}>
          <planeGeometry args={[0.58, 0.32]} />
        </mesh>
        <mesh ref={bulbRef} position={[0, 0, 0.019]}>
          <planeGeometry args={[0.52, 0.26]} />
          <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1} toneMapped={false} transparent opacity={0.8} />
        </mesh>
      </group>

      <StatusHologram accentColor={accentColor} />

      <Chair position={[0, 0, 0.85]} seatColor="#1c1826" />

      {/* Flanking plants — echoes Reception's symmetric framing */}
      <Plant position={[-1.55, 0, 0.75]} scale={1} />
      <Plant position={[1.55, 0, 0.75]} scale={1} />

      <WorkstationSign position={[1.25, 0, 1.05]} rotationY={Math.PI * 0.15} label="NATALI" accentColor={accentColor} />
    </group>
  );
}
