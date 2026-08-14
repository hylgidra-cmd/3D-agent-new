import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, type Mesh } from "three";
import { darkMetalMaterial, darkWoodMaterial } from "../materials";

export interface DeskProps {
  /** Overall tabletop width (X). Matches Workstation's monitor-count sizing. */
  width: number;
}

/**
 * A real desk — beveled two-tone tabletop, a drawer pedestal (with actual drawer fronts +
 * handles, not a flat panel) on the right leg, a plain panel leg + lower stretcher on the left,
 * a cable tray along the back edge, and a desk lamp. Replaces the earlier single-slab-plus-two-
 * panel-legs placeholder.
 */
export default function Desk({ width }: DeskProps) {
  const bulbRef = useRef<Mesh>(null);
  const halfWidth = width / 2;

  useFrame(({ clock }) => {
    const mat = bulbRef.current?.material;
    if (mat && !Array.isArray(mat) && "emissiveIntensity" in mat) {
      mat.emissiveIntensity = 1.1 + Math.sin(clock.getElapsedTime() * 2) * 0.08;
    }
  });

  return (
    <group>
      {/* Tabletop — two-tone bevel: a slightly smaller, lighter top layer over the base slab */}
      <mesh castShadow receiveShadow position={[0, 0.74, 0]} material={darkWoodMaterial}>
        <boxGeometry args={[width, 0.05, 0.9]} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.775, 0]}>
        <boxGeometry args={[width - 0.06, 0.015, 0.86]} />
        <meshStandardMaterial color="#4a3120" roughness={0.5} metalness={0.1} />
      </mesh>

      {/* Left leg — plain panel + lower stretcher */}
      <mesh castShadow receiveShadow position={[-halfWidth + 0.06, 0.37, 0]} material={darkMetalMaterial}>
        <boxGeometry args={[0.06, 0.72, 0.62]} />
      </mesh>

      {/* Right side — drawer pedestal instead of a flat panel */}
      <group position={[halfWidth - 0.22, 0, 0.05]}>
        <mesh castShadow receiveShadow position={[0, 0.37, 0]} material={darkMetalMaterial}>
          <boxGeometry args={[0.34, 0.7, 0.56]} />
        </mesh>
        {[0.58, 0.36, 0.14].map((y, i) => (
          <group key={i} position={[0, y, 0.285]}>
            <mesh castShadow position={[0, 0, 0]}>
              <boxGeometry args={[0.3, 0.18, 0.015]} />
              <meshStandardMaterial color="#1a1f27" roughness={0.4} metalness={0.4} />
            </mesh>
            <mesh position={[0, -0.02, 0.01]} material={darkMetalMaterial}>
              <boxGeometry args={[0.1, 0.018, 0.018]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Lower stretcher bar between the legs, for structural realism */}
      <mesh castShadow receiveShadow position={[0, 0.1, -0.2]} material={darkMetalMaterial}>
        <boxGeometry args={[width - 0.5, 0.04, 0.04]} />
      </mesh>

      {/* Cable tray along the back edge */}
      <mesh castShadow receiveShadow position={[0, 0.68, -0.4]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[width - 0.6, 0.06, 0.1]} />
        <meshStandardMaterial color="#0d0f13" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* Desk lamp — back-left corner */}
      <group position={[-halfWidth + 0.28, 0.75, -0.32]}>
        <mesh castShadow receiveShadow position={[0, 0.02, 0]} material={darkMetalMaterial}>
          <cylinderGeometry args={[0.06, 0.07, 0.03, 10]} />
        </mesh>
        <mesh castShadow position={[0, 0.16, 0.03]} rotation={[0.5, 0, 0]} material={darkMetalMaterial}>
          <cylinderGeometry args={[0.012, 0.012, 0.32, 6]} />
        </mesh>
        <mesh castShadow position={[0, 0.32, 0.16]} rotation={[1.1, 0, 0]} material={darkMetalMaterial}>
          <cylinderGeometry args={[0.012, 0.012, 0.22, 6]} />
        </mesh>
        <mesh castShadow position={[0, 0.38, 0.26]} rotation={[1.3, 0, 0]}>
          <coneGeometry args={[0.07, 0.1, 12, 1, true]} />
          <meshStandardMaterial color="#2a2f38" roughness={0.4} metalness={0.4} side={DoubleSide} />
        </mesh>
        <mesh ref={bulbRef} position={[0, 0.34, 0.26]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#ffdca8" emissive="#ffdca8" emissiveIntensity={1.1} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 0.34, 0.26]} intensity={1.2} distance={1.6} color="#ffdca8" />
      </group>

      {/* Monitor riser — slim raised platform the monitors sit on */}
      <mesh castShadow receiveShadow position={[0, 0.78, -0.24]}>
        <boxGeometry args={[Math.min(width - 0.3, 1.5), 0.02, 0.14]} />
        <meshStandardMaterial color="#14171d" roughness={0.4} metalness={0.4} />
      </mesh>
    </group>
  );
}
