import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import type { Group, Mesh } from "three";
import { Color, MeshStandardMaterial } from "three";
import type { AgentId, AgentState } from "../data/agents";

export interface AgentCharacterProps {
  id: AgentId;
  color: string;
  accentColor: string;
  /** Omitted for roles whose head accessory already covers the head (Graphic's beret,
   * Frontend's hoodie) — see data/agents.ts's hairColor field. */
  hairColor?: string;
  state: AgentState;
  isSelected: boolean;
}

/**
 * Minecraft-inspired blocky character — grouped box primitives (head/body/arms/legs), same
 * silhouette language as the office's earlier single-room prototype, but NOT a Steve/Alex
 * reskin: every role gets its own procedural head accessory (rendered by RoleAccessory below),
 * its own hair (Hair below, where the accessory doesn't already cover the head), and a real
 * two-eyes-plus-mouth face (Face below, with an idle blink) — so agents stay recognizable and
 * expressive even from the office's default top-down-ish camera angle.
 *
 * Purely presentational — position/rotation come from the parent group (AgentController writes
 * those imperatively from the simulation store); this component only owns its own local
 * limb/idle/blink animation, branched on `state`.
 */
export default function AgentCharacter({ id, color, accentColor, hairColor, state, isSelected }: AgentCharacterProps) {
  const bodyRef = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const head = useRef<Mesh>(null);
  const leftEye = useRef<Group>(null);
  const rightEye = useRef<Group>(null);

  // Staggers each character's blink cycle so a whole room of agents never blinks in unison.
  const blinkPhase = useMemo(() => Math.random() * 5, []);

  const skinColor = useMemo(() => new Color("#f2c9a0"), []);
  const bodyColor = useMemo(() => new Color(color), [color]);
  const limbColor = useMemo(() => new Color(color).multiplyScalar(0.75), [color]);
  const accent = useMemo(() => new Color(accentColor), [accentColor]);

  const bodyMat = useMemo(
    () => new MeshStandardMaterial({ color: bodyColor, roughness: 0.35, metalness: 0.15 }),
    [bodyColor],
  );
  const limbMat = useMemo(
    () => new MeshStandardMaterial({ color: limbColor, roughness: 0.4, metalness: 0.1 }),
    [limbColor],
  );
  const skinMat = useMemo(
    () => new MeshStandardMaterial({ color: skinColor, roughness: 0.6, metalness: 0 }),
    [skinColor],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (bodyRef.current) {
      // Everyone breathes/bobs a little except while walking (handled by the leg cycle instead).
      bodyRef.current.position.y = state === "WALKING" ? 0 : Math.sin(t * 1.6) * 0.03;
    }

    // Idle blink — a quick eyelid close every ~4.5s, staggered per character.
    const blinkCycle = (t + blinkPhase) % 4.5;
    const blinkScale = blinkCycle > 4.35 ? 0.12 : 1;
    if (leftEye.current) leftEye.current.scale.y = blinkScale;
    if (rightEye.current) rightEye.current.scale.y = blinkScale;

    switch (state) {
      case "WORKING": {
        const swing = Math.sin(t * 9) * 0.35;
        if (leftArm.current) leftArm.current.rotation.x = -0.9 + swing;
        if (rightArm.current) rightArm.current.rotation.x = -0.9 - swing;
        if (leftLeg.current) leftLeg.current.rotation.x = 0;
        if (rightLeg.current) rightLeg.current.rotation.x = 0;
        if (head.current) head.current.rotation.x = Math.sin(t * 2.2) * 0.06;
        break;
      }
      case "WALKING": {
        const cycle = Math.sin(t * 8);
        if (leftArm.current) leftArm.current.rotation.x = cycle * 0.7;
        if (rightArm.current) rightArm.current.rotation.x = -cycle * 0.7;
        if (leftLeg.current) leftLeg.current.rotation.x = -cycle * 0.7;
        if (rightLeg.current) rightLeg.current.rotation.x = cycle * 0.7;
        if (head.current) head.current.rotation.x = 0;
        break;
      }
      case "MEETING":
      case "BREAK": {
        // Seated approximation — thighs rotated forward, arms resting.
        if (leftArm.current) leftArm.current.rotation.x = 0.15;
        if (rightArm.current) rightArm.current.rotation.x = -0.15;
        if (leftLeg.current) leftLeg.current.rotation.x = -1.35;
        if (rightLeg.current) rightLeg.current.rotation.x = -1.35;
        if (head.current) head.current.rotation.y = Math.sin(t * 0.4) * 0.2;
        break;
      }
      case "MANAGING": {
        // Natali's own base pose — an attentive, seated-at-the-command-desk stance: arms
        // gently folded rather than typing, head slowly scanning the office like she's actually
        // keeping an eye on the team, not just idling.
        if (leftArm.current) leftArm.current.rotation.x = -0.55;
        if (rightArm.current) rightArm.current.rotation.x = -0.5;
        if (leftLeg.current) leftLeg.current.rotation.x = -1.35;
        if (rightLeg.current) rightLeg.current.rotation.x = -1.35;
        if (head.current) head.current.rotation.y = Math.sin(t * 0.35) * 0.35;
        break;
      }
      case "SLEEP":
        // Renders an entirely different (lying-down) JSX tree below — nothing to animate on
        // the standing rig's refs, which aren't even mounted right now.
        break;
      default: {
        const sway = Math.sin(t * 1.2) * 0.08;
        if (leftArm.current) leftArm.current.rotation.x = sway;
        if (rightArm.current) rightArm.current.rotation.x = -sway;
        if (leftLeg.current) leftLeg.current.rotation.x = 0;
        if (rightLeg.current) rightLeg.current.rotation.x = 0;
        if (head.current) head.current.rotation.y = Math.sin(t * 0.5) * 0.15;
      }
    }
  });

  if (state === "SLEEP") {
    // A deliberately separate, simplified representation rather than rotating the standing
    // rig's nested pivots 90° — a lying body built from its own flat blocks stays precisely
    // where the bed waypoint puts it (see data/agents.ts's BED_WAYPOINTS), with no risk of the
    // rotated standing rig's limb hierarchy overshooting the mattress.
    return (
      <group ref={bodyRef}>
        <mesh castShadow receiveShadow position={[0, 0.34, -0.6]} material={bodyMat}>
          <boxGeometry args={[0.4, 0.26, 1.2]} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.37, 0.05]} material={skinMat}>
          <boxGeometry args={[0.42, 0.32, 0.4]} />
        </mesh>
        {/* Blanket-colored accent stripe, echoing the real bed's blanket in RestRoom.tsx */}
        <mesh position={[0, 0.485, -0.7]}>
          <boxGeometry args={[0.42, 0.02, 0.95]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} />
        </mesh>
        <SleepZzz accent={accent} />
        {isSelected && <SelectionRing color={accent} />}
      </group>
    );
  }

  const isSeated = state === "MEETING" || state === "BREAK" || state === "MANAGING";

  return (
    <group ref={bodyRef} position={[0, isSeated ? -0.28 : 0, 0]}>
      {/* Legs */}
      <group ref={leftLeg} position={[-0.14, 0.8, 0]}>
        <mesh castShadow receiveShadow position={[0, -0.4, 0]} material={limbMat}>
          <boxGeometry args={[0.22, 0.8, 0.24]} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.14, 0.8, 0]}>
        <mesh castShadow receiveShadow position={[0, -0.4, 0]} material={limbMat}>
          <boxGeometry args={[0.22, 0.8, 0.24]} />
        </mesh>
      </group>

      {/* Body */}
      <mesh castShadow receiveShadow position={[0, 1.1, 0]} material={bodyMat}>
        <boxGeometry args={[0.56, 0.72, 0.32]} />
      </mesh>

      {/* Chest status LED */}
      <mesh position={[0, 1.15, 0.17]}>
        <boxGeometry args={[0.08, 0.08, 0.02]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={state === "WORKING" ? 1.6 : 0.5} />
      </mesh>

      {/* Arms */}
      <group ref={leftArm} position={[-0.39, 1.42, 0]}>
        <mesh castShadow receiveShadow position={[0, -0.32, 0]} material={limbMat}>
          <boxGeometry args={[0.2, 0.64, 0.22]} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.39, 1.42, 0]}>
        <mesh castShadow receiveShadow position={[0, -0.32, 0]} material={limbMat}>
          <boxGeometry args={[0.2, 0.64, 0.22]} />
        </mesh>
      </group>

      {/* Head */}
      <mesh ref={head} castShadow receiveShadow position={[0, 1.86, 0]} material={skinMat}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />

        {/* Eyes — white + colored pupil per side, individually blink-animated */}
        <group ref={leftEye} position={[-0.1, 0.02, 0.255]}>
          <mesh castShadow>
            <boxGeometry args={[0.1, 0.12, 0.02]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.01, 0.011]}>
            <boxGeometry args={[0.05, 0.055, 0.012]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
        </group>
        <group ref={rightEye} position={[0.1, 0.02, 0.255]}>
          <mesh castShadow>
            <boxGeometry args={[0.1, 0.12, 0.02]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.01, 0.011]}>
            <boxGeometry args={[0.05, 0.055, 0.012]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
        </group>

        {/* A small, friendly mouth line */}
        <mesh position={[0, -0.12, 0.253]}>
          <boxGeometry args={[0.16, 0.025, 0.015]} />
          <meshStandardMaterial color="#7a4a3a" roughness={0.6} />
        </mesh>

        {hairColor && <Hair id={id} color={hairColor} />}
        <RoleAccessory id={id} accent={accent} />
      </mesh>

      {/* Selection ring — pulsing halo under the feet, only when this agent is selected. */}
      {isSelected && <SelectionRing color={accent} />}
    </group>
  );
}

/** A small "Zzz" that drifts gently upward and shrinks away — the universal "sleeping" tell.
 * Animates a wrapping group (a plain, well-typed ref target) rather than reaching into drei
 * Text's own troika-backed ref, whose material typing isn't a stable target to animate. */
function SleepZzz({ accent }: { accent: Color }) {
  const groupRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const cycle = clock.getElapsedTime() % 3;
    groupRef.current.position.set(-0.15 + cycle * 0.05, 0.55 + cycle * 0.12, 0);
    groupRef.current.scale.setScalar(1 - cycle / 6);
  });
  return (
    <group ref={groupRef} position={[-0.15, 0.55, 0]}>
      <Text fontSize={0.16} color={accent} anchorX="center" anchorY="middle" fillOpacity={0.85}>
        Z z z
      </Text>
    </group>
  );
}

function SelectionRing({ color }: { color: Color }) {
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const pulse = 0.9 + Math.sin(clock.getElapsedTime() * 3) * 0.1;
    ring.current.scale.setScalar(pulse);
  });
  return (
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.78, 0]}>
      <ringGeometry args={[0.42, 0.55, 32]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.85} />
    </mesh>
  );
}

/**
 * Hair, one shape per role that doesn't already have a head-covering accessory (Graphic's
 * beret and Frontend's hoodie already read as head coverings, so those two skip this — see
 * AgentCharacter's hairColor prop / data/agents.ts's hairColor field).
 */
function Hair({ id, color }: { id: AgentId; color: string }) {
  const hairMat = <meshStandardMaterial color={color} roughness={0.6} />;

  switch (id) {
    case "UI_UX":
      // Neat, professional rounded top.
      return (
        <mesh position={[0, 0.28, -0.02]} castShadow>
          <boxGeometry args={[0.52, 0.14, 0.48]} />
          {hairMat}
        </mesh>
      );
    case "3D_Model": {
      // Tousled, creative spikes.
      const spikes = [-0.13, 0, 0.13];
      return (
        <group position={[0, 0.26, -0.03]}>
          {spikes.map((x, i) => (
            <mesh key={x} position={[x, i === 1 ? 0.05 : 0, 0]} rotation={[0.15, 0, (i - 1) * 0.4]} castShadow>
              <coneGeometry args={[0.09, 0.24, 6]} />
              {hairMat}
            </mesh>
          ))}
        </group>
      );
    }
    case "Backend":
      // Short, utilitarian buzz cut.
      return (
        <mesh position={[0, 0.255, -0.02]} castShadow>
          <boxGeometry args={[0.51, 0.06, 0.49]} />
          {hairMat}
        </mesh>
      );
    case "Android_iOS":
      // Trendy asymmetric side-swept style.
      return (
        <mesh position={[0.05, 0.28, -0.03]} rotation={[0, 0, -0.12]} castShadow>
          <boxGeometry args={[0.5, 0.16, 0.46]} />
          {hairMat}
        </mesh>
      );
    case "Natali":
      // Neat, elegant updo — a rounded crown plus a small back bun, reading as polished/
      // executive rather than casual, distinct from every engineering role's hair.
      return (
        <group position={[0, 0.27, -0.02]}>
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.51, 0.13, 0.47]} />
            {hairMat}
          </mesh>
          <mesh position={[0, 0.02, -0.26]} castShadow>
            <sphereGeometry args={[0.11, 10, 10]} />
            {hairMat}
          </mesh>
        </group>
      );
    default:
      return null;
  }
}

/**
 * One procedural, non-Minecraft-default accessory per role — chosen to read clearly even from
 * the office's top-down default camera angle, per the office's "recognizable roster" brief.
 */
function RoleAccessory({ id, accent }: { id: AgentId; accent: Color }) {
  const spin = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (spin.current) spin.current.rotation.y = clock.getElapsedTime() * 1.2;
  });

  const accentMat = <meshStandardMaterial color={accent} roughness={0.3} metalness={0.5} />;

  switch (id) {
    case "Graphic":
      // Tilted beret — creative, colorful silhouette from above.
      return (
        <mesh position={[0, 0.3, -0.02]} rotation={[0.15, 0, 0.25]} castShadow>
          <cylinderGeometry args={[0.3, 0.32, 0.12, 16]} />
          {accentMat}
        </mesh>
      );
    case "UI_UX":
      // Slim designer glasses, resting just in front of the eyes.
      return (
        <mesh position={[0, 0.03, 0.29]} castShadow>
          <boxGeometry args={[0.34, 0.06, 0.03]} />
          {accentMat}
        </mesh>
      );
    case "3D_Model":
      // Floating slowly-spinning wireframe cube — an unmistakable literal "3D" icon.
      return (
        <mesh ref={spin} position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.22, 0.22, 0.22]} />
          <meshStandardMaterial color={accent} wireframe />
        </mesh>
      );
    case "Frontend":
      // Hoodie — an extra shell offset up/back from the head, developer-hoodie silhouette.
      return (
        <mesh position={[0, 0.16, -0.08]} castShadow>
          <boxGeometry args={[0.58, 0.3, 0.58]} />
          <meshStandardMaterial color={accent} roughness={0.7} metalness={0} transparent opacity={0.92} />
        </mesh>
      );
    case "Backend":
      // Small antenna + chip — infrastructure/technical read.
      return (
        <group>
          <mesh position={[0.16, 0.32, -0.14]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.22, 6]} />
            {accentMat}
          </mesh>
          <mesh position={[0.16, 0.44, -0.14]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1} />
          </mesh>
        </group>
      );
    case "Android_iOS":
      // Small phone held up beside the head.
      return (
        <mesh position={[0.34, -0.05, 0.18]} rotation={[0, 0.3, 0.1]} castShadow>
          <boxGeometry args={[0.16, 0.28, 0.03]} />
          {accentMat}
        </mesh>
      );
    case "Natali": {
      // A slim gold comms headset — she's coordinating the whole office/chat, not building
      // anything herself, so an "always reachable" accessory reads better than a work tool.
      // Band approximated as three short arched segments over the crown (robust from any
      // camera angle, unlike getting a torus's rotation exactly right), plus one earcup and a
      // mic boom curving down toward her mouth.
      const band: Array<{ x: number; y: number; rotZ: number }> = [
        { x: -0.18, y: 0.34, rotZ: -0.5 },
        { x: 0, y: 0.4, rotZ: 0 },
        { x: 0.18, y: 0.34, rotZ: 0.5 },
      ];
      return (
        <group>
          {band.map((b, i) => (
            <mesh key={i} position={[b.x, b.y, 0]} rotation={[0, 0, b.rotZ]} castShadow>
              <boxGeometry args={[0.16, 0.03, 0.03]} />
              {accentMat}
            </mesh>
          ))}
          <mesh position={[0.26, 0.02, 0]} castShadow>
            <sphereGeometry args={[0.07, 10, 10]} />
            {accentMat}
          </mesh>
          <mesh position={[0.26, -0.08, 0.2]} rotation={[0.3, 0, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.22, 8]} />
            {accentMat}
          </mesh>
          <mesh position={[0.26, -0.16, 0.28]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
        </group>
      );
    }
    default:
      return null;
  }
}
