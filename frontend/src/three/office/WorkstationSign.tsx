import { Text } from "@react-three/drei";
import { darkMetalMaterial } from "../materials";

export interface WorkstationSignProps {
  position: [number, number, number];
  rotationY?: number;
  label: string;
  accentColor: string;
}

/**
 * A small standing nameplate — pole + backlit plaque + role label — planted beside a
 * workstation. Now that the office no longer color-codes whole floor zones per department
 * (see Structure.tsx), this is the wayfinding: walk up to a desk and its sign tells you exactly
 * which agent works there.
 */
export default function WorkstationSign({ position, rotationY = 0, label, accentColor }: WorkstationSignProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.55, 0]} material={darkMetalMaterial}>
        <cylinderGeometry args={[0.02, 0.02, 1.1, 8]} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 1.15, 0]}>
        <boxGeometry args={[0.5, 0.22, 0.03]} />
        <meshStandardMaterial color="#12151b" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.15, 0.017]}>
        <boxGeometry args={[0.44, 0.03, 0.005]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
      <Text position={[0, 1.19, 0.02]} fontSize={0.075} color="#e6e9ee" anchorX="center" anchorY="middle" maxWidth={0.42}>
        {label}
      </Text>
    </group>
  );
}
