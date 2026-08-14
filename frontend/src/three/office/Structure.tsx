import { useMemo } from "react";
import { concreteMaterial, darkMetalMaterial, floorMaterial, glassMaterial } from "../materials";
import { AGENT_ROOM_BOUNDS, OFFICE_BOUNDS } from "./officeBounds";
import DepartmentDivider from "./DepartmentDivider";

const WALL_HEIGHT = 3.2;
const WALL_THICKNESS = 0.15;

/** Hardwood-toned floor strip under the whole shared workstation room — a real
 * flooring-material transition (matte, desaturated warm wood), not a saturated department-color
 * rectangle. */
function WoodFloorStrip() {
  const { minX, maxX, minZ, maxZ } = AGENT_ROOM_BOUNDS;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, 0.01, centerZ]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color="#5a3b24" roughness={0.85} metalness={0} />
    </mesh>
  );
}

interface GlassWallProps {
  /** Segment centerline, in world space. */
  center: [number, number, number];
  /** Full length of the segment along its own axis. */
  length: number;
  axis: "x" | "z";
  mullionEvery?: number;
}

/** A low glass curtain-wall segment with slim structural mullions — same visual language as the
 * office's original single-room prototype, extended around the whole building perimeter. */
function GlassWall({ center, length, axis, mullionEvery = 4 }: GlassWallProps) {
  const size: [number, number, number] =
    axis === "x" ? [length, WALL_HEIGHT, WALL_THICKNESS] : [WALL_THICKNESS, WALL_HEIGHT, length];

  const mullionCount = Math.max(2, Math.floor(length / mullionEvery));
  const mullions = useMemo(
    () =>
      Array.from({ length: mullionCount + 1 }, (_, i) => -length / 2 + (i * length) / mullionCount),
    [mullionCount, length],
  );

  return (
    <group position={center}>
      <mesh receiveShadow material={glassMaterial}>
        <boxGeometry args={size} />
      </mesh>
      {mullions.map((offset, i) => (
        <mesh
          key={i}
          castShadow
          position={axis === "x" ? [offset, 0, 0] : [0, 0, offset]}
          material={darkMetalMaterial}
        >
          <boxGeometry args={axis === "x" ? [0.06, WALL_HEIGHT, 0.06] : [0.06, WALL_HEIGHT, 0.06]} />
        </mesh>
      ))}
      {/* Low concrete curb along the base for grounding. */}
      <mesh
        receiveShadow
        position={[0, -WALL_HEIGHT / 2 + 0.08, 0]}
        material={concreteMaterial}
      >
        <boxGeometry args={axis === "x" ? [length, 0.16, 0.3] : [0.3, 0.16, length]} />
      </mesh>
    </group>
  );
}

/**
 * The building shell: a polished-concrete floor with a hardwood strip under the shared
 * workstation room, a low glass curtain-wall perimeter with a gap at the front entrance, and the
 * shared workstation room itself is ALSO enclosed in glass (not solid walls) — real room
 * separation without ever blocking sightlines or light, so the room reads as part of the office
 * rather than a wall cutting it off. Deliberately no roof — the office stays open-topped so the
 * default camera always has a clear view straight down into every room.
 */
export default function Structure() {
  const { minX, maxX, minZ, maxZ } = OFFICE_BOUNDS;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;

  const entranceGapHalf = 5;

  const room = AGENT_ROOM_BOUNDS;
  const doorGapMin = -0.25;
  const doorGapMax = 2.25;

  return (
    <group>
      {/* Base polished-concrete floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, 0, centerZ]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <primitive object={floorMaterial} attach="material" />
      </mesh>

      {/* Hardwood floor under the shared workstation room */}
      <WoodFloorStrip />

      {/* Perimeter glass walls */}
      <GlassWall center={[minX, WALL_HEIGHT / 2, centerZ]} length={depth} axis="z" />
      <GlassWall center={[maxX, WALL_HEIGHT / 2, centerZ]} length={depth} axis="z" />
      <GlassWall center={[centerX, WALL_HEIGHT / 2, minZ]} length={width} axis="x" />

      {/* Front wall — split into two segments, leaving an open entrance gap in the middle */}
      <GlassWall
        center={[(minX - entranceGapHalf) / 2, WALL_HEIGHT / 2, maxZ]}
        length={-entranceGapHalf - minX}
        axis="x"
      />
      <GlassWall
        center={[(entranceGapHalf + maxX) / 2, WALL_HEIGHT / 2, maxZ]}
        length={maxX - entranceGapHalf}
        axis="x"
      />

      {/* Shared workstation room — glass walls enclosing all six desks (see this room shape
          fully, no obstruction). West side reuses the exterior glass wall above; north/south
          cap the room, and the east (inner) wall faces the open plaza with a doorway gap so
          agents can walk in and out. */}
      <DepartmentDivider
        center={[(room.minX + room.maxX) / 2, 1.3, room.maxZ]}
        length={room.maxX - room.minX}
        height={2.6}
        axis="x"
        material={glassMaterial}
      />
      <DepartmentDivider
        center={[(room.minX + room.maxX) / 2, 1.3, room.minZ]}
        length={room.maxX - room.minX}
        height={2.6}
        axis="x"
        material={glassMaterial}
      />
      <DepartmentDivider
        center={[room.maxX, 1.3, (room.maxZ + doorGapMax) / 2]}
        length={room.maxZ - doorGapMax}
        height={2.6}
        axis="z"
        material={glassMaterial}
      />
      <DepartmentDivider
        center={[room.maxX, 1.3, (room.minZ + doorGapMin) / 2]}
        length={doorGapMin - room.minZ}
        height={2.6}
        axis="z"
        material={glassMaterial}
      />
    </group>
  );
}
