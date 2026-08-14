import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import type { Mesh } from "three";
import { darkMetalMaterial, darkWoodMaterial, screenOffMaterial, stoneMaterial } from "../materials";
import Chair from "./Chair";
import Plant from "./Plant";

interface NetworkNode {
  x: number;
  y: number;
  phase: number;
}

/** Small wall-mounted "AI network" panel — a grid of pulsing nodes over faint connecting
 * lines. Purely a company-identity touch (item 14: "the environment must communicate this is
 * an AI company") — a subtle nod to a neural net / agent-mesh visualization, not a literal
 * dashboard. */
function NetworkPanel({ position }: { position: [number, number, number] }) {
  const nodes = useMemo<NetworkNode[]>(() => {
    const list: NetworkNode[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        list.push({ x: -0.16 + col * 0.16, y: -0.14 + row * 0.14, phase: (row * 3 + col) * 0.6 });
      }
    }
    return list;
  }, []);

  return (
    <group position={position}>
      <mesh castShadow receiveShadow material={darkMetalMaterial}>
        <boxGeometry args={[0.6, 0.5, 0.03]} />
      </mesh>
      <mesh position={[0, 0, 0.017]}>
        <planeGeometry args={[0.52, 0.42]} />
        <meshStandardMaterial color="#0a0e14" roughness={0.6} />
      </mesh>
      {/* Faint connecting lines between neighboring nodes */}
      {nodes.slice(0, 6).map((n, i) => (
        <mesh key={`line-${i}`} position={[n.x + 0.08, n.y + 0.07, 0.019]} rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.19, 0.006]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.3} toneMapped={false} />
        </mesh>
      ))}
      {nodes.map((n, i) => (
        <NetworkDot key={i} x={n.x} y={n.y} phase={n.phase} />
      ))}
    </group>
  );
}

function NetworkDot({ x, y, phase }: { x: number; y: number; phase: number }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const mat = ref.current?.material;
    if (mat && !Array.isArray(mat) && "emissiveIntensity" in mat) {
      mat.emissiveIntensity = 0.6 + Math.max(0, Math.sin(clock.getElapsedTime() * 1.8 - phase)) * 1.2;
    }
  });
  return (
    <mesh ref={ref} position={[x, y, 0.02]}>
      <circleGeometry args={[0.02, 10]} />
      <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={0.6} toneMapped={false} />
    </mesh>
  );
}

/**
 * The reception desk + signage — the "heart of the company" at the front of the plaza, facing
 * the entrance. The AI OFFICE wordmark is a backlit sign panel rather than flat CSS text, with
 * its own accent light so it reads as a landmark from anywhere in the plaza. Two real waiting
 * chairs (not a flat bench) plus a small AI-network identity panel round it out.
 */
export default function Reception() {
  return (
    <group position={[0, 0, 11]} rotation={[0, Math.PI, 0]}>
      {/* Sign panel wall behind the desk */}
      <mesh castShadow receiveShadow position={[0, 1.6, -1.1]} material={stoneMaterial}>
        <boxGeometry args={[6, 2.6, 0.3]} />
      </mesh>
      <Text
        position={[0, 1.75, -0.93]}
        fontSize={0.62}
        letterSpacing={0.08}
        color="#e6e9ee"
        anchorX="center"
        anchorY="middle"
      >
        AI OFFICE
      </Text>
      <Text
        position={[0, 1.15, -0.93]}
        fontSize={0.18}
        letterSpacing={0.15}
        color="#7dd3fc"
        anchorX="center"
        anchorY="middle"
      >
        AUTONOMOUS AGENT WORKPLACE
      </Text>
      <pointLight position={[0, 1.9, -0.4]} intensity={4} distance={6} color="#7dd3fc" />

      {/* AI network identity panel, flanking the wordmark */}
      <NetworkPanel position={[2.3, 1.35, -0.93]} />

      {/* Reception counter */}
      <mesh castShadow receiveShadow position={[0, 0.55, 0]} material={darkWoodMaterial}>
        <boxGeometry args={[4.4, 1.1, 0.7]} />
      </mesh>
      <mesh position={[0, 1.12, 0.36]}>
        <boxGeometry args={[4.4, 0.03, 0.02]} />
        <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={0.8} />
      </mesh>

      {/* Small desk monitor angled toward whoever's checking in */}
      <group position={[0.8, 1.1, -0.1]} rotation={[0, Math.PI * 0.15, 0]}>
        <mesh castShadow receiveShadow position={[0, 0.22, 0]} material={darkMetalMaterial}>
          <boxGeometry args={[0.03, 0.2, 0.03]} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.4, 0]} material={screenOffMaterial}>
          <boxGeometry args={[0.42, 0.28, 0.03]} />
        </mesh>
        <mesh position={[0, 0.4, 0.016]}>
          <boxGeometry args={[0.36, 0.22, 0.01]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1} toneMapped={false} />
        </mesh>
      </group>

      {/* Reception's own office chair, tucked behind the counter (between the counter and the
          sign wall at z=-1.1), facing forward toward the counter/visitors. */}
      <Chair position={[-0.8, 0, -0.65]} rotationY={0} seatColor="#1a1f27" />

      {/* Flanking plants */}
      <Plant position={[-2.6, 0, -0.5]} scale={1.2} />
      <Plant position={[2.6, 0, -0.5]} scale={1.2} />

      {/* Waiting chairs facing the counter — real seats, not a flat bench */}
      <Chair position={[-0.9, 0, 2.6]} rotationY={Math.PI} seatColor="#2a3140" />
      <Chair position={[0.9, 0, 2.6]} rotationY={Math.PI} seatColor="#2a3140" />
    </group>
  );
}
