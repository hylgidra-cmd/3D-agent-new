import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ShaderMaterial, Color, DoubleSide, type Mesh } from "three";
import { concreteMaterial, darkMetalMaterial, stoneMaterial } from "../materials";
import Plant from "./Plant";

// Cheap animated "water" — vertex ripple + a moving two-tone fragment pattern. Avoids a real
// fluid sim (overkill for a small decorative basin) while still reading as live water rather
// than a static blue disc, per the brief's "optimized animated material if realistic sim is too
// expensive" allowance.
const waterVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float ripple = sin((pos.x * 6.0) + uTime * 2.0) * 0.02 + cos((pos.y * 6.0) - uTime * 1.6) * 0.02;
    pos.z += ripple;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const waterFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorDeep;
  uniform vec3 uColorLight;
  varying vec2 vUv;
  void main() {
    float pattern = sin(vUv.x * 24.0 + uTime * 1.4) * sin(vUv.y * 24.0 - uTime * 1.1);
    float mixAmount = smoothstep(-0.4, 0.7, pattern);
    vec3 color = mix(uColorDeep, uColorLight, mixAmount);
    gl_FragColor = vec4(color, 0.82);
  }
`;

function WaterSurface({ radius }: { radius: number }) {
  const mesh = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: waterVertexShader,
        fragmentShader: waterFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uColorDeep: { value: new Color("#0b3a5c") },
          uColorLight: { value: new Color("#3fb6e8") },
        },
        transparent: true,
        side: DoubleSide,
      }),
    [],
  );

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.42, 0]} material={material}>
      <circleGeometry args={[radius, 48]} />
    </mesh>
  );
}

/**
 * The central plaza fountain — tiered stone basin, animated water surface, a decorative center
 * spire, surrounding stone blocks + plants, and a soft blue accent light. Deliberately scaled
 * down and de-emphasized: a decorative plaza accent, not the office's visual centerpiece — the
 * workstations/agents/rooms take priority (see item 20 of the redesign brief).
 */
export default function Fountain() {
  return (
    <group position={[0, 0, 6]} scale={0.72}>
      {/* Base tier */}
      <mesh castShadow receiveShadow position={[0, 0.2, 0]} material={stoneMaterial}>
        <cylinderGeometry args={[2.6, 2.8, 0.4, 24]} />
      </mesh>
      {/* Upper basin wall */}
      <mesh castShadow receiveShadow position={[0, 0.55, 0]} material={concreteMaterial}>
        <cylinderGeometry args={[2.3, 2.4, 0.3, 24]} />
      </mesh>

      <WaterSurface radius={2.15} />

      {/* Center spire the water seems to rise from */}
      <mesh castShadow position={[0, 0.75, 0]} material={darkMetalMaterial}>
        <cylinderGeometry args={[0.12, 0.16, 0.7, 10]} />
      </mesh>
      <mesh castShadow position={[0, 1.15, 0]} material={darkMetalMaterial}>
        <sphereGeometry args={[0.18, 12, 12]} />
      </mesh>

      {/* Soft blue glow — modest, so it reads as a landmark accent, not a dominant light source */}
      <pointLight position={[0, 1.2, 0]} intensity={4} distance={7} color="#3fb6e8" />

      {/* Surrounding stone blocks + plants */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        const r = 3.4;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        return i % 2 === 0 ? (
          <mesh key={i} castShadow receiveShadow position={[x, 0.15, z]} material={stoneMaterial}>
            <boxGeometry args={[0.5, 0.3, 0.5]} />
          </mesh>
        ) : (
          <Plant key={i} position={[x, 0, z]} scale={0.85} />
        );
      })}
    </group>
  );
}
