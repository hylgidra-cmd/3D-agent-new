import FileCabinet from "./FileCabinet";
import WaterCooler from "./WaterCooler";

/**
 * Small furnishing pass so the office reads as fully populated rather than a few big set-pieces
 * in an otherwise empty shell — file cabinets against the shared workstation room's west
 * (exterior) and east (interior) walls, clear of every agent waypoint/desk, plus water coolers
 * at two open circulation spots (the plaza near reception, and the junction between the
 * workstation room and the back rooms). Positions were checked against the actual waypoint/desk
 * coordinates in data/agents.ts and Structure.tsx's AGENT_ROOM_BOUNDS, not guessed.
 */
export default function InteriorProps() {
  return (
    <group>
      {/* West wall — behind Column A's chairs */}
      <FileCabinet position={[-19, 0, 6.5]} rotationY={-Math.PI / 2} />
      <FileCabinet position={[-19, 0, -6]} rotationY={-Math.PI / 2} />

      {/* East (interior) wall — behind Column B's desks, flanking the doorway */}
      <FileCabinet position={[-6.7, 0, 6]} rotationY={Math.PI / 2} />
      <FileCabinet position={[-6.7, 0, -4]} rotationY={Math.PI / 2} />

      {/* Plaza, near reception */}
      <WaterCooler position={[-4.6, 0, 9.2]} rotationY={Math.PI * 0.75} />

      {/* Junction between the workstation room and the meeting/lounge/server back rooms */}
      <WaterCooler position={[7.6, 0, -1.6]} rotationY={-Math.PI / 4} />
    </group>
  );
}
