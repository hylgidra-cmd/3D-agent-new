import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { darkMetalMaterial } from "../materials";

export interface WaterCoolerProps {
  position: [number, number, number];
  rotationY?: number;
}

/** A blocky water cooler with a softly glinting bottle — small circulation-area filler prop
 * (plaza edge, wing junctions) that reads as "someone actually works here" at a glance. */
export default function WaterCooler({ position, rotationY = 0 }: WaterCoolerProps) {
  const bottleRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!bottleRef.current) return;
    const mat = bottleRef.current.material;
    if (!Array.isArray(mat) && "emissiveIntensity" in mat) {
      mat.emissiveIntensity = 0.35 + Math.sin(clock.getElapsedTime() * 0.8) * 0.08;
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Base unit */}
      <mesh castShadow receiveShadow position={[0, 0.55, 0]} material={darkMetalMaterial}>
        <boxGeometry args={[0.36, 1.1, 0.36]} />
      </mesh>
      {/* Drip tray */}
      <mesh castShadow receiveShadow position={[0, 0.92, 0.02]}>
        <boxGeometry args={[0.3, 0.03, 0.22]} />
        <meshStandardMaterial color="#3a3f47" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Water bottle */}
      <mesh ref={bottleRef} castShadow position={[0, 1.32, 0]}>
        <cylinderGeometry args={[0.16, 0.19, 0.55, 16]} />
        <meshStandardMaterial
          color="#3fb6e8"
          transparent
          opacity={0.55}
          roughness={0.1}
          metalness={0.1}
          emissive="#3fb6e8"
          emissiveIntensity={0.35}
        />
      </mesh>
      <mesh castShadow position={[0, 1.63, 0]}>
        <cylinderGeometry args={[0.08, 0.16, 0.1, 16]} />
        <meshStandardMaterial color="#3fb6e8" transparent opacity={0.55} roughness={0.1} metalness={0.1} />
      </mesh>
    </group>
  );
}
