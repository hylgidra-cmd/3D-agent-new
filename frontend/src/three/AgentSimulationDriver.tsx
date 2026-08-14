import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AGENTS,
  BREAK_WAYPOINTS,
  pickFreeRoamWaypoint,
  WAYPOINTS,
  type AgentId,
  type AgentState,
  type WaypointId,
} from "../data/agents";
import { useOfficeStore } from "../store/officeStore";
import { useActivityLogStore } from "../store/activityLogStore";
import { assignTask } from "../task/taskAssignment";

const WALK_SPEED = 2.4; // units/second
const ARRIVE_EPSILON = 0.05;
const TURN_SPEED = 8; // radians/second, exponential approach

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function normalizeAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/**
 * No visual output — mounted once inside <Canvas>. Owns two things:
 *  1. The actual walking mechanics (position/rotation interpolation toward a target, arrival
 *     detection) for every agent, regardless of why they're walking.
 *  2. What an agent does once it has nothing left to do — which is entirely governed by the
 *     office-wide mode set by ModeControlPanel (see officeStore.ts's setOfficeMode): WORK/
 *     MEETING agents just stay put once they arrive, BREAK agents keep wandering between the
 *     six break spots for as long as BREAK mode stays active.
 *
 * Moves agents by writing straight into useOfficeStore via setAgentTransform/setAgentState/
 * setAgentTarget — see officeStore.ts's "Future AI integration" note for how this gets swapped
 * for real backend events later without touching AgentController at all.
 *
 * Dwell timers are pure internal bookkeeping with no reactive consumers, so they live in a
 * plain ref here rather than in the zustand store — no reason to pay a store update for them.
 */
export default function AgentSimulationDriver() {
  const dwellTimers = useRef<Record<AgentId, number>>(
    Object.fromEntries(AGENTS.map((agent, i) => [agent.id, 6 + i * 4])) as Record<AgentId, number>,
  );

  useFrame((_, delta) => {
    const store = useOfficeStore.getState();

    for (let i = 0; i < AGENTS.length; i++) {
      const agent = AGENTS[i];
      const runtime = store.agents[agent.id];

      // Pinned by a real task assignment (TaskAssignmentPanel) — leave it alone entirely,
      // exactly like LocalPageBackend's AgentSimulationService skips ManualOverride agents.
      if (runtime.manualOverride) continue;

      // Natali never wanders — she runs the office from her central desk regardless of dwell
      // timers or global office mode. Skipped before any index-based lookup below, since
      // BREAK_WAYPOINTS/pickFreeRoamWaypoint are only 6 long and index-matched to the other 6
      // agents, not to her.
      if (agent.centralManager) continue;

      if (runtime.targetWaypoint) {
        stepTowardTarget(agent.id, runtime.targetWaypoint, delta, store);
        continue;
      }

      dwellTimers.current[agent.id] -= delta;
      if (dwellTimers.current[agent.id] <= 0) {
        dwellTimers.current[agent.id] = decideNextAction(agent.id, i, store);
      }
    }
  });

  return null;
}

function stepTowardTarget(
  id: AgentId,
  targetId: WaypointId,
  delta: number,
  store: ReturnType<typeof useOfficeStore.getState>,
) {
  const runtime = store.agents[id];
  const target = WAYPOINTS[targetId];
  const [x, y, z] = runtime.position;
  const [tx, , tz] = target.position;

  const dx = tx - x;
  const dz = tz - z;
  const distance = Math.hypot(dx, dz);

  if (distance <= ARRIVE_EPSILON) {
    store.setAgentTransform(id, target.position, target.rotationY);
    store.setAgentTarget(id, null);

    const arrivedState = stateForWaypoint(targetId);

    // Natali dispatched this agent home to start a real task (see taskAssignment.ts's
    // dispatchTaskViaChat) — hand off to the same real/simulated task flow every other
    // assignment path uses, instead of the usual random sample task below.
    const pending = store.pendingTasks[id];
    if (arrivedState === "WORKING" && pending) {
      store.setPendingTask(id, null);
      assignTask(id, pending.task, pending.timeLimitMinutes);
      return;
    }

    const agent = AGENTS.find((a) => a.id === id)!;
    const task =
      arrivedState === "WORKING"
        ? agent.sampleTasks[Math.floor(Math.random() * agent.sampleTasks.length)]
        : null;
    store.setAgentState(id, arrivedState, task);
    logArrival(agent.personName, arrivedState, task);
    return;
  }

  const step = Math.min(WALK_SPEED * delta, distance);
  const nextX = x + (dx / distance) * step;
  const nextZ = z + (dz / distance) * step;

  const desiredAngle = Math.atan2(dx, dz);
  const angleDelta = normalizeAngle(desiredAngle - runtime.rotationY);
  const nextRotation = runtime.rotationY + angleDelta * Math.min(1, TURN_SPEED * delta);

  store.setAgentTransform(id, [nextX, y, nextZ], nextRotation);
}

function stateForWaypoint(waypointId: WaypointId): AgentState {
  if (waypointId.endsWith("-workstation")) return "WORKING";
  if (waypointId.startsWith("meeting-seat")) return "MEETING";
  if (waypointId.startsWith("bed")) return "SLEEP";
  return "BREAK";
}

/** Pushes one line to the ActivityFeed terminal widget whenever an agent settles into a new
 * state — either just arrived somewhere, or decided to stay at the desk with a new task. */
function logArrival(personName: string, state: AgentState, task: string | null) {
  const log = useActivityLogStore.getState().log;
  if (state === "WORKING" && task) log(`> ${personName} is working on: ${task}`);
  else if (state === "MEETING") log(`> ${personName} joined the meeting`);
  else if (state === "BREAK") log(`> ${personName} is taking a break`);
  else if (state === "SLEEP") log(`> ${personName} went to sleep`);
}

/**
 * Called only when an agent has arrived somewhere and has nothing queued — i.e. never overrides
 * a real task, and only ever acts within whatever the current global office mode allows:
 *  - WORK: nothing to decide, just refresh the sample task text so the info panel feels alive.
 *  - MEETING: nothing to decide at all — stay seated until the mode changes.
 *  - BREAK: casually wander to a different one of the six break spots and repeat.
 *  - FREE: casually re-roll bed-or-break-spot (see pickFreeRoamWaypoint) and repeat.
 * Returns the new dwell duration (seconds) before this agent is reconsidered again.
 */
function decideNextAction(
  id: AgentId,
  index: number,
  store: ReturnType<typeof useOfficeStore.getState>,
): number {
  const agent = AGENTS[index];
  const runtime = store.agents[id];

  if (store.officeMode === "FREE") {
    const { waypointId, state } = pickFreeRoamWaypoint(index);
    store.setAgentTarget(id, waypointId);
    store.setAgentState(id, "WALKING");
    return state === "SLEEP" ? randomRange(20, 35) : randomRange(12, 22);
  }

  if (store.officeMode === "BREAK") {
    const otherSpots = BREAK_WAYPOINTS.filter((spot) => spot !== runtime.currentWaypoint);
    const next = otherSpots[Math.floor(Math.random() * otherSpots.length)] ?? BREAK_WAYPOINTS[index];
    store.setAgentTarget(id, next);
    store.setAgentState(id, "WALKING");
    return randomRange(12, 22);
  }

  if (store.officeMode === "WORK") {
    const task = agent.sampleTasks[Math.floor(Math.random() * agent.sampleTasks.length)];
    store.setAgentState(id, "WORKING", task);
    logArrival(agent.personName, "WORKING", task);
    return randomRange(14, 24);
  }

  // MEETING — nothing to do but stay seated; just re-check occasionally.
  return randomRange(20, 30);
}
