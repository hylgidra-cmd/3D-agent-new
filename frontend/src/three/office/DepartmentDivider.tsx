import type { Material } from "three";

export interface DepartmentDividerProps {
  center: [number, number, number];
  length: number;
  height?: number;
  thickness?: number;
  axis: "x" | "z";
  material: Material;
}

/**
 * A short, solid partition wall between two adjacent workstations — real architecture standing
 * in for the flat floor-color zoning the office used to rely on. Deliberately short (sized to
 * just the desk/chair cluster it separates, not spanning the whole depth of the building) so it
 * can't clip into the back rooms (lounge/server/meeting), which sit much further along the same
 * axis with plenty of clearance.
 */
export default function DepartmentDivider({
  center,
  length,
  height = 2.3,
  thickness = 0.12,
  axis,
  material,
}: DepartmentDividerProps) {
  const size: [number, number, number] = axis === "x" ? [length, height, thickness] : [thickness, height, length];

  return (
    <mesh castShadow receiveShadow position={center} material={material}>
      <boxGeometry args={size} />
    </mesh>
  );
}
