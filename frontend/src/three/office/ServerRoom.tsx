import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type Group, type InstancedMesh, Object3D } from "three";
import { concreteMaterial, darkMetalMaterial, glassMaterial } from "../materials";

const dummy = new Object3D();
const scratchColor = new Color();
const LED_ON = new Color("#34d399");
const LED_OFF = new Color("#0f2418");

const RACK_ROWS: Array<{ z: number; count: number }> = [
  { z: -1.1, count: 5 },
  { z: 1.1, count: 5 },
];
const RACK_SPACING = 0.75;

/** Instanced rack bodies + instanced top LEDs (one draw call each, N instances) — the racks are
 * geometrically identical, so this is exactly the "use instancing for repeated objects" case. */
function ServerRacks() {
  const rackMesh = useRef<InstancedMesh>(null);
  const ledMesh = useRef<InstancedMesh>(null);

  const positions = useMemo(() => {
    const list: [number, number][] = [];
    for (const row of RACK_ROWS) {
      const startX = -((row.count - 1) * RACK_SPACING) / 2;
      for (let col = 0; col < row.count; col++) {
        list.push([startX + col * RACK_SPACING, row.z]);
      }
    }
    return list;
  }, []);

  useEffect(() => {
    if (!rackMesh.current || !ledMesh.current) return;
    positions.forEach(([x, z], i) => {
      dummy.position.set(x, 0.9, z);
      dummy.updateMatrix();
      rackMesh.current!.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, 1.83, z);
      dummy.updateMatrix();
      ledMesh.current!.setMatrixAt(i, dummy.matrix);
    });
    rackMesh.current.instanceMatrix.needsUpdate = true;
    ledMesh.current.instanceMatrix.needsUpdate = true;
  }, [positions]);

  useFrame(({ clock }) => {
    if (!ledMesh.current) return;
    const t = clock.getElapsedTime();
    positions.forEach((_, i) => {
      const on = Math.sin(t * (2.5 + i * 0.6) + i * 1.7) > 0.2;
      scratchColor.copy(on ? LED_ON : LED_OFF);
      ledMesh.current!.setColorAt(i, scratchColor);
    });
    if (ledMesh.current.instanceColor) ledMesh.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh
        ref={rackMesh}
        args={[undefined, undefined, positions.length]}
        castShadow
        receiveShadow
        material={darkMetalMaterial}
      >
        <boxGeometry args={[0.6, 1.8, 0.55]} />
      </instancedMesh>
      {/* Per-instance color drives diffuse only (three.js instanceColor doesn't affect
          emissive), so this is lit rather than glowing — the room's own green/cyan point
          lights below are what make the "on" LEDs pop against the "off" ones. */}
      <instancedMesh ref={ledMesh} args={[undefined, undefined, positions.length]}>
        <boxGeometry args={[0.3, 0.03, 0.42]} />
        <meshStandardMaterial toneMapped={false} roughness={0.3} vertexColors />
      </instancedMesh>
    </group>
  );
}

/** A wall-mounted cooling fan — spinning blades read as active climate control, reinforcing
 * "infrastructure that needs cooling" rather than just decorative racks. */
function CoolingFan({ position }: { position: [number, number, number] }) {
  const bladeRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (bladeRef.current) bladeRef.current.rotation.z = clock.getElapsedTime() * 6;
  });
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow receiveShadow material={darkMetalMaterial}>
        <cylinderGeometry args={[0.32, 0.32, 0.06, 20]} />
      </mesh>
      <group ref={bladeRef} position={[0, 0.035, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, (i / 4) * Math.PI * 2, 0]} position={[0.14, 0, 0]}>
            <boxGeometry args={[0.24, 0.01, 0.06]} />
            <meshStandardMaterial color="#3a4150" roughness={0.4} metalness={0.5} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 0.036, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.02, 12]} />
        <meshStandardMaterial color="#1a1f27" roughness={0.3} metalness={0.6} />
      </mesh>
    </group>
  );
}

/** A small technical wall display — a static readout of bar/line data, distinct from the
 * reception's identity-branding network panel; this one reads as "infrastructure monitoring." */
function TechnicalDisplay({ position }: { position: [number, number, number] }) {
  const barHeights = useMemo(() => [0.12, 0.2, 0.09, 0.24, 0.15, 0.19, 0.1], []);
  return (
    <group position={position}>
      <mesh castShadow receiveShadow material={darkMetalMaterial}>
        <boxGeometry args={[0.9, 0.55, 0.03]} />
      </mesh>
      <mesh position={[0, 0, 0.017]}>
        <planeGeometry args={[0.8, 0.45]} />
        <meshStandardMaterial color="#050a08" roughness={0.6} />
      </mesh>
      {barHeights.map((h, i) => (
        <mesh key={i} position={[-0.32 + i * 0.105, -0.14 + h / 2, 0.019]}>
          <planeGeometry args={[0.07, h]} />
          <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Cables() {
  const cables = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        x: -2 + i * 0.8,
        z: (i % 2 === 0 ? -1 : 1) * 1.9,
        rotY: (i % 3) * 0.4,
      })),
    [],
  );
  return (
    <>
      {cables.map((c, i) => (
        <mesh key={i} castShadow position={[c.x, 0.03, c.z]} rotation={[0, c.rotY, 0]}>
          <boxGeometry args={[0.9, 0.03, 0.05]} />
          <meshStandardMaterial color="#111418" roughness={0.6} />
        </mesh>
      ))}
    </>
  );
}

/**
 * Backend/AI infrastructure room: instanced server racks with blinking status LEDs, floor
 * cable clutter, a glass viewing panel toward the plaza, and cool green/blue technical
 * lighting — deliberately darker and moodier than the rest of the office.
 */
export default function ServerRoom() {
  return (
    <group position={[-11, 0, -11]}>
      {/* Dim, cool ambient wash so the room reads as its own darker zone */}
      <pointLight position={[0, 2.4, 0]} intensity={5} distance={7} color="#22d3ee" />
      <pointLight position={[-2, 1.5, -1.5]} intensity={3} distance={4} color="#34d399" />

      {/* Partition walls — back + sides, glass panel on the plaza-facing side */}
      <mesh castShadow receiveShadow position={[0, 1.1, -3.2]} material={concreteMaterial}>
        <boxGeometry args={[8.5, 2.2, 0.2]} />
      </mesh>
      <mesh castShadow receiveShadow position={[-4.15, 1.1, -0.8]} material={concreteMaterial}>
        <boxGeometry args={[0.2, 2.2, 5]} />
      </mesh>
      <mesh castShadow receiveShadow position={[4.15, 1.1, -0.8]} material={concreteMaterial}>
        <boxGeometry args={[0.2, 2.2, 5]} />
      </mesh>
      <mesh receiveShadow position={[0, 1.1, 3.05]} material={glassMaterial}>
        <boxGeometry args={[8.5, 2.2, 0.08]} />
      </mesh>

      {/* Cooling fans + a monitoring display on the back wall */}
      <CoolingFan position={[-3.2, 1.6, -3.1]} />
      <CoolingFan position={[3.2, 1.6, -3.1]} />
      <TechnicalDisplay position={[0, 1.8, -3.13]} />

      <ServerRacks />
      <Cables />
    </group>
  );
}
