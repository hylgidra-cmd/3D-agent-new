import { Suspense } from "react";
import Structure from "./office/Structure";
import Reception from "./office/Reception";
import MeetingRoom from "./office/MeetingRoom";
import Lounge from "./office/Lounge";
import ServerRoom from "./office/ServerRoom";
import RestRoom from "./office/RestRoom";
import Exterior from "./office/Exterior";
import InteriorProps from "./office/InteriorProps";
import CeilingLights from "./office/CeilingLights";
import Workstation from "./office/Workstation";
import CommandDesk from "./office/CommandDesk";
import AgentController from "./AgentController";
import AgentSimulationDriver from "./AgentSimulationDriver";
import OfficeLighting from "./OfficeLighting";
import { AGENTS, AGENTS_BY_ID, WAYPOINTS, type AgentId, type Waypoint } from "../data/agents";

const MONITOR_COUNT: Record<AgentId, 1 | 2 | 3> = {
  Graphic: 2,
  UI_UX: 2,
  "3D_Model": 1,
  Frontend: 3,
  Backend: 2,
  Android_iOS: 1,
  // Never actually rendered — Natali gets CommandDesk below, not a standard Workstation (see
  // the AGENTS.filter in the desk-rendering loop). Present only to satisfy the exhaustive
  // Record<AgentId, ...> type.
  Natali: 1,
};

// The 6 engineering roles get a standard desk; Natali gets her own CommandDesk instead (see
// below) — never both.
const WORKSTATION_AGENTS = AGENTS.filter((agent) => !agent.centralManager);

// The character stands at waypoint.position facing waypoint.rotationY (toward the monitor).
// Workstation's own internal layout puts its chair 0.85 units along its local +Z and its
// monitor along local -Z, so — to make the chair land exactly on the waypoint and the monitor
// sit in front of the character — the desk group itself is offset 0.85 units further along the
// character's forward direction and rotated 180° from the character's own facing.
const DESK_CHAIR_OFFSET = 0.85;

function deskTransformFor(waypoint: Waypoint): { position: [number, number, number]; rotationY: number } {
  const forwardX = Math.sin(waypoint.rotationY);
  const forwardZ = Math.cos(waypoint.rotationY);
  return {
    position: [
      waypoint.position[0] + forwardX * DESK_CHAIR_OFFSET,
      waypoint.position[1],
      waypoint.position[2] + forwardZ * DESK_CHAIR_OFFSET,
    ],
    rotationY: waypoint.rotationY + Math.PI,
  };
}

/**
 * Top-level composition of the whole 3D office. Every workstation and agent is derived from
 * data/agents.ts — nothing here hardcodes "Frontend goes at x=14"; adding an agent to that
 * roster (with a matching workstation waypoint) is enough to place a new character in the scene.
 * The one deliberate exception is Natali (AIAgent's `centralManager` flag): the other 6 all
 * share the one generic Workstation look, but she gets her own CommandDesk instead — see
 * WORKSTATION_AGENTS above.
 */
export default function OfficeScene() {
  const natali = AGENTS_BY_ID.Natali;
  const nataliDesk = deskTransformFor(WAYPOINTS[natali.workstationId]);

  return (
    <Suspense fallback={null}>
      <Exterior />
      <OfficeLighting />

      <Structure />
      <Reception />
      <MeetingRoom />
      <Lounge />
      <ServerRoom />
      <RestRoom />
      <InteriorProps />
      <CeilingLights />

      {WORKSTATION_AGENTS.map((agent) => {
        const desk = deskTransformFor(WAYPOINTS[agent.workstationId]);
        return (
          <Workstation
            key={agent.id}
            role={agent.id}
            position={desk.position}
            rotationY={desk.rotationY}
            accentColor={agent.color}
            monitorCount={MONITOR_COUNT[agent.id]}
          />
        );
      })}

      {/* Natali's central command desk — her own distinct look, not a Workstation reskin. */}
      <CommandDesk position={nataliDesk.position} rotationY={nataliDesk.rotationY} accentColor={natali.accentColor} />

      {AGENTS.map((agent) => (
        <AgentController key={agent.id} agent={agent} />
      ))}

      <AgentSimulationDriver />
    </Suspense>
  );
}
