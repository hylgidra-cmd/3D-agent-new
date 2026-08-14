import { foliageMaterial, potMaterial } from "../materials";

export interface PlantProps {
  position: [number, number, number];
  scale?: number;
}

/** Small reusable potted-plant blockout — used across reception, lounge, meeting room, workstations. */
export default function Plant({ position, scale = 1 }: PlantProps) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow receiveShadow position={[0, 0.18, 0]} material={potMaterial}>
        <cylinderGeometry args={[0.22, 0.18, 0.36, 8]} />
      </mesh>
      <mesh castShadow position={[0, 0.55, 0]} material={foliageMaterial}>
        <sphereGeometry args={[0.32, 8, 8]} />
      </mesh>
      <mesh castShadow position={[0.12, 0.72, 0.08]} material={foliageMaterial}>
        <sphereGeometry args={[0.2, 8, 8]} />
      </mesh>
      <mesh castShadow position={[-0.14, 0.68, -0.05]} material={foliageMaterial}>
        <sphereGeometry args={[0.18, 8, 8]} />
      </mesh>
    </group>
  );
}
