import { Billboard, RoundedBox, Text } from "@react-three/drei";

export interface AgentNameplateProps {
  personName: string;
  jobTitle: string;
  accentColor: string;
  emphasized: boolean;
}

/**
 * The floating card above every agent — a frosted-white "glass" plaque (not just bare outlined
 * text) with the agent's personal name on top and their job title underneath, plus a thin
 * accent strip in their identity color. Always rendered regardless of state, so it stays
 * readable while the agent is actively working, not just on hover/select.
 */
export default function AgentNameplate({ personName, jobTitle, accentColor, emphasized }: AgentNameplateProps) {
  return (
    <Billboard position={[0, 2.66, 0]}>
      <group scale={emphasized ? 1.12 : 1}>
        {/* Frosted white glass plaque */}
        <RoundedBox args={[0.92, 0.36, 0.02]} radius={0.045} smoothness={4}>
          <meshStandardMaterial color="#f7f9fc" transparent opacity={0.93} roughness={0.25} metalness={0.05} />
        </RoundedBox>

        {/* Identity-color accent strip along the bottom edge */}
        <mesh position={[0, -0.15, 0.011]}>
          <planeGeometry args={[0.84, 0.03]} />
          <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.6} toneMapped={false} />
        </mesh>

        <Text position={[0, 0.065, 0.012]} fontSize={0.125} color="#0f172a" anchorX="center" anchorY="middle" maxWidth={0.82}>
          {personName}
        </Text>
        <Text position={[0, -0.075, 0.012]} fontSize={0.068} color="#475569" anchorX="center" anchorY="middle" maxWidth={0.82}>
          {jobTitle}
        </Text>
      </group>
    </Billboard>
  );
}
