import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, MeshStandardMaterial } from "three";
import { AGENTS_BY_ID, type AgentId } from "../../data/agents";
import { useOfficeStore } from "../../store/officeStore";
import { darkMetalMaterial, screenOffMaterial } from "../materials";
import Chair from "./Chair";
import Desk from "./Desk";
import Plant from "./Plant";
import WorkstationSign from "./WorkstationSign";

export interface WorkstationProps {
  role: AgentId;
  position: [number, number, number];
  rotationY: number;
  accentColor: string;
  monitorCount: 1 | 2 | 3;
}

const IDLE_GLOW = 0.14;
const WORKING_GLOW = 0.55;

type ScreenType = "code" | "design" | "wireframe3d" | "uxwireframe" | "terminal" | "mobileui";

const SCREEN_TYPE_BY_ROLE: Record<AgentId, ScreenType> = {
  Graphic: "design",
  UI_UX: "uxwireframe",
  "3D_Model": "wireframe3d",
  Frontend: "code",
  Backend: "terminal",
  Android_iOS: "mobileui",
  // Never actually rendered — Natali gets three/office/CommandDesk.tsx instead of this generic
  // Workstation (see OfficeScene's WORKSTATION_AGENTS filter). Present only to satisfy the
  // exhaustive Record<AgentId, ...> type.
  Natali: "terminal",
};

/** One line of a simulated code/terminal readout — its own material instance + useFrame so
 * lines flicker on independent, staggered phases (reads as "actively typing"). */
function TextLine({
  width,
  y,
  phase,
  isWorking,
  color,
}: {
  width: number;
  y: number;
  phase: number;
  isWorking: boolean;
  color: string;
}) {
  const meshRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const mat = meshRef.current?.material as MeshStandardMaterial | undefined;
    if (!mat) return;
    if (isWorking) {
      const flicker = Math.max(0, Math.sin(clock.getElapsedTime() * 3 - phase));
      mat.emissiveIntensity = 0.5 + flicker * 1.1;
    } else {
      mat.emissiveIntensity = IDLE_GLOW * 0.6;
    }
  });

  return (
    <mesh ref={meshRef} position={[-0.24 + width / 2, y, 0.001]}>
      <planeGeometry args={[width, 0.022]} />
      <meshStandardMaterial color={color} emissive={color} toneMapped={false} />
    </mesh>
  );
}

/** Screen content, one visual language per role — the whole point being that a Graphic
 * Designer's monitor should never look like a Backend Developer's. Only renders while
 * isWorking; an idle monitor just shows its dim backlight (handled by the parent Monitor). */
function ScreenContent({ screenType, isWorking, accentColor }: { screenType: ScreenType; isWorking: boolean; accentColor: string }) {
  // Hooks must run unconditionally on every render (even the branches that won't use this
  // value) — computing it up front, before the isWorking/screenType branches below, keeps
  // this component's hook order stable regardless of which branch ends up rendering.
  const lineWidths = useMemo(() => Array.from({ length: 5 }, () => 0.16 + Math.random() * 0.42), []);

  if (!isWorking) return null;

  if (screenType === "code" || screenType === "terminal") {
    const color = screenType === "terminal" ? "#34d399" : accentColor;
    return (
      <group position={[0, 0.68, 0]}>
        {lineWidths.map((w, i) => (
          <TextLine key={i} width={w} y={-i * 0.055} phase={i * 0.8} isWorking={isWorking} color={color} />
        ))}
        {screenType === "terminal" && <ServerBars />}
      </group>
    );
  }

  if (screenType === "design") {
    const swatches = ["#f87171", "#facc15", "#4ade80", "#38bdf8", "#a78bfa", "#fb7185"];
    return (
      <group position={[-0.16, 0.62, 0]}>
        {swatches.map((c, i) => (
          <mesh key={c} position={[(i % 3) * 0.15, -Math.floor(i / 3) * 0.15, 0.001]}>
            <planeGeometry args={[0.12, 0.11]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.7} toneMapped={false} />
          </mesh>
        ))}
      </group>
    );
  }

  if (screenType === "uxwireframe") {
    const boxes: Array<{ w: number; h: number; x: number; y: number }> = [
      { w: 0.46, h: 0.06, x: 0, y: 0.11 },
      { w: 0.2, h: 0.16, x: -0.13, y: -0.03 },
      { w: 0.2, h: 0.16, x: 0.13, y: -0.03 },
      { w: 0.46, h: 0.05, x: 0, y: -0.14 },
    ];
    return (
      <group position={[0, 0.55, 0.001]}>
        {boxes.map((b, i) => (
          <WireframeRect key={i} w={b.w} h={b.h} x={b.x} y={b.y} color={accentColor} />
        ))}
      </group>
    );
  }

  if (screenType === "wireframe3d") {
    return <RotatingWireframe accentColor={accentColor} />;
  }

  // mobileui — a phone-shaped outline with a couple of "app icon" dots
  return (
    <group position={[0, 0.55, 0.001]}>
      <WireframeRect w={0.2} h={0.34} x={0} y={0} color={accentColor} />
      {[-0.05, 0, 0.05].map((x) => (
        <mesh key={x} position={[x, 0.08, 0]}>
          <circleGeometry args={[0.018, 10]} />
          <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** A thin four-bar rectangle outline — used for the UI/UX wireframe blocks and the mobile
 * phone-shape preview. Plain declarative plane geometry, no runtime geometry-instantiation. */
function WireframeRect({ w, h, x, y, color }: { w: number; h: number; x: number; y: number; color: string }) {
  const barMat = <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.85} toneMapped={false} />;
  const t = 0.006;
  return (
    <group position={[x, y, 0]}>
      <mesh position={[0, h / 2, 0]}>
        <planeGeometry args={[w, t]} />
        {barMat}
      </mesh>
      <mesh position={[0, -h / 2, 0]}>
        <planeGeometry args={[w, t]} />
        {barMat}
      </mesh>
      <mesh position={[-w / 2, 0, 0]}>
        <planeGeometry args={[t, h]} />
        {barMat}
      </mesh>
      <mesh position={[w / 2, 0, 0]}>
        <planeGeometry args={[t, h]} />
        {barMat}
      </mesh>
    </group>
  );
}

function ServerBars() {
  const heights = useMemo(() => [0.08, 0.14, 0.06, 0.18, 0.1], []);
  return (
    <group position={[0.14, -0.28, 0]}>
      {heights.map((h, i) => (
        <mesh key={i} position={[i * 0.035, h / 2, 0]}>
          <planeGeometry args={[0.024, h]} />
          <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function RotatingWireframe({ accentColor }: { accentColor: string }) {
  const meshRef = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) meshRef.current.rotation.y = clock.getElapsedTime() * 0.9;
  });
  return (
    <mesh ref={meshRef} position={[0, 0.55, 0.03]}>
      <icosahedronGeometry args={[0.14, 0]} />
      <meshStandardMaterial color={accentColor} wireframe />
    </mesh>
  );
}

/** One monitor screen at a local offset. Backlight + role-specific content both react to
 * whether the owning agent is actually WORKING right now — bright and active at the desk, dim
 * and idle the moment they walk away (Meeting/Break/Walking). */
function Monitor({ x, accentColor, isWorking, screenType }: { x: number; accentColor: string; isWorking: boolean; screenType: ScreenType }) {
  const backlightRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const mat = backlightRef.current?.material as MeshStandardMaterial | undefined;
    if (!mat) return;
    mat.emissiveIntensity = isWorking
      ? WORKING_GLOW + Math.sin(clock.getElapsedTime() * 1.6 + x) * 0.08
      : IDLE_GLOW;
  });

  return (
    <group position={[x, 0, -0.25]}>
      <mesh castShadow receiveShadow position={[0, 0.3, 0]} material={darkMetalMaterial}>
        <boxGeometry args={[0.04, 0.28, 0.04]} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.55, 0]} material={screenOffMaterial}>
        <boxGeometry args={[0.62, 0.4, 0.04]} />
      </mesh>

      {/* Backlight plate — dim when idle, warm glow when actively working */}
      <mesh ref={backlightRef} position={[0, 0.55, 0.021]}>
        <boxGeometry args={[0.55, 0.33, 0.01]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={IDLE_GLOW} toneMapped={false} />
      </mesh>

      <ScreenContent screenType={screenType} isWorking={isWorking} accentColor={accentColor} />
    </group>
  );
}

/** A small rounded mouse — squashed sphere reads better than a flat box at this scale. */
function Mouse({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} scale={[1, 0.5, 1.6]} castShadow>
      <sphereGeometry args={[0.045, 12, 8]} />
      <meshStandardMaterial color="#181c24" roughness={0.4} metalness={0.2} />
    </mesh>
  );
}

/** A notepad + pen and a coffee mug — small "someone actually sits here" desk accessories,
 * shared across every workstation regardless of role. */
function DeskAccessories({ x, accentColor }: { x: number; accentColor: string }) {
  return (
    <group position={[x, 0.785, 0.3]}>
      <mesh castShadow rotation={[-Math.PI / 2, 0, 0.15]}>
        <boxGeometry args={[0.14, 0.18, 0.005]} />
        <meshStandardMaterial color="#e8ecef" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0.09, 0.005, 0.02]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.004, 0.004, 0.14, 6]} />
        <meshStandardMaterial color="#f97316" roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0.2, 0.03, -0.02]}>
        <cylinderGeometry args={[0.035, 0.03, 0.06, 12]} />
        <meshStandardMaterial color={accentColor} roughness={0.4} metalness={0.1} />
      </mesh>
    </group>
  );
}

/**
 * A real workstation — a proper multi-part Desk (drawer pedestal, cable tray, lamp), a wheeled
 * office Chair, 1-3 monitors whose screen content and glow reflect this agent's role and live
 * WORKING state, keyboard + rounded mouse, one role-specific hero prop, small desk accessories,
 * and a nameplate sign. Parameterized so all six workstations share one implementation but read
 * as genuinely different jobs.
 */
export default function Workstation({ role, position, rotationY, accentColor, monitorCount }: WorkstationProps) {
  const isWorking = useOfficeStore((s) => s.agents[role]?.state === "WORKING");
  const screenType = SCREEN_TYPE_BY_ROLE[role];
  const agentName = AGENTS_BY_ID[role].name.toUpperCase();

  const monitorOffsets = useMemo(() => {
    if (monitorCount === 1) return [0];
    if (monitorCount === 2) return [-0.42, 0.42];
    return [-0.62, 0, 0.62];
  }, [monitorCount]);

  const deskWidth = monitorCount >= 3 ? 2.3 : 1.8;
  const halfWidth = deskWidth / 2;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Desk width={deskWidth} />

      {/* Accent edge strip along the desk front */}
      <mesh position={[0, 0.72, 0.455]}>
        <boxGeometry args={[deskWidth, 0.02, 0.01]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={isWorking ? 0.9 : 0.35} />
      </mesh>

      {/* Monitors */}
      {monitorOffsets.map((x) => (
        <Monitor key={x} x={x} accentColor={accentColor} isWorking={isWorking} screenType={screenType} />
      ))}

      {/* Keyboard + rounded mouse */}
      <mesh position={[-0.08, 0.785, 0.18]} castShadow>
        <boxGeometry args={[0.42, 0.02, 0.16]} />
        <meshStandardMaterial color="#12151b" roughness={0.5} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[-0.26 + i * 0.052, 0.797, 0.18]}>
          <boxGeometry args={[0.038, 0.01, 0.12]} />
          <meshStandardMaterial color="#20252e" roughness={0.6} />
        </mesh>
      ))}
      <Mouse position={[0.22, 0.783, 0.2]} />
      {/* Front-left corner — clear of the front-right role prop cluster and the back-left lamp */}
      <DeskAccessories x={-halfWidth + 0.3} accentColor={accentColor} />

      <WorkstationProp role={role} accentColor={accentColor} />

      <Chair position={[0, 0, 0.85]} />

      {/* Small desk-side plant for warmth */}
      <Plant position={[-halfWidth - 0.25, 0, 0.5]} scale={0.6} />

      {/* Nameplate — planted at the desk's outer front corner */}
      <WorkstationSign position={[halfWidth + 0.35, 0, 0.6]} rotationY={Math.PI * 0.15} label={agentName} accentColor={accentColor} />
    </group>
  );
}

/** One distinguishing desk prop per role — same pattern as AgentCharacter's RoleAccessory, so
 * the workstation itself (not just the character standing at it) reads as belonging to that role. */
function WorkstationProp({ role, accentColor }: { role: AgentId; accentColor: string }) {
  const accentMat = <meshStandardMaterial color={accentColor} roughness={0.35} metalness={0.4} />;

  switch (role) {
    case "Graphic": {
      const paintDabs: Array<{ color: string; x: number }> = [
        { color: "#f87171", x: 0.05 },
        { color: "#facc15", x: -0.02 },
        { color: "#4ade80", x: -0.08 },
      ];
      return (
        <group position={[0.65, 0.78, 0.2]}>
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.02, 16]} />
            {accentMat}
          </mesh>
          {paintDabs.map((dab) => (
            <mesh key={dab.color} position={[dab.x, 0.02, 0.02]} castShadow>
              <sphereGeometry args={[0.025, 8, 8]} />
              <meshStandardMaterial color={dab.color} />
            </mesh>
          ))}
          {/* Drawing tablet, leaning against the monitor stand */}
          <mesh position={[-0.32, 0.02, -0.14]} rotation={[-0.3, 0, 0]} castShadow>
            <boxGeometry args={[0.3, 0.02, 0.2]} />
            <meshStandardMaterial color="#12151b" roughness={0.3} metalness={0.3} />
          </mesh>
        </group>
      );
    }
    case "3D_Model":
      return (
        <mesh position={[0.6, 1.0, -0.3]} rotation={[0.4, 0.6, 0]} castShadow>
          <icosahedronGeometry args={[0.16, 0]} />
          <meshStandardMaterial color={accentColor} wireframe />
        </mesh>
      );
    case "Backend":
      return (
        <group position={[0.68, 0.55, 0.15]}>
          <mesh castShadow receiveShadow material={darkMetalMaterial}>
            <boxGeometry args={[0.18, 0.5, 0.3]} />
          </mesh>
          {[0.12, 0, -0.12].map((y, i) => (
            <mesh key={i} position={[0.095, y, 0.05]}>
              <boxGeometry args={[0.01, 0.03, 0.03]} />
              <meshStandardMaterial
                color={accentColor}
                emissive={accentColor}
                emissiveIntensity={i === 0 ? 1.2 : 0.4}
              />
            </mesh>
          ))}
        </group>
      );
    case "Android_iOS":
      return (
        <group position={[0.62, 0, 0.22]}>
          <mesh position={[0, 0.8, 0]} rotation={[-0.3, 0, 0.1]} castShadow>
            <boxGeometry args={[0.22, 0.36, 0.02]} />
            {accentMat}
          </mesh>
          {/* Tablet propped beside the phone */}
          <mesh position={[-0.24, 0.78, -0.02]} rotation={[-0.25, 0.15, 0]} castShadow>
            <boxGeometry args={[0.3, 0.4, 0.015]} />
            <meshStandardMaterial color="#12151b" roughness={0.3} metalness={0.3} />
          </mesh>
        </group>
      );
    case "UI_UX":
      return (
        <mesh position={[0.62, 0.8, 0.2]} rotation={[-0.5, 0.2, 0]} castShadow>
          <boxGeometry args={[0.3, 0.22, 0.015]} />
          {accentMat}
        </mesh>
      );
    default:
      return null;
  }
}
