import { create } from "zustand";
import {
  AGENTS,
  BREAK_WAYPOINTS,
  MEETING_SEAT_WAYPOINTS,
  WAYPOINTS,
  pickFreeRoamWaypoint,
  type AgentId,
  type AgentState,
  type WaypointId,
} from "../data/agents";
import { useActivityLogStore } from "./activityLogStore";

/** The four global buttons in ModeControlPanel — see setOfficeMode for what each one does. */
export type OfficeMode = "WORK" | "MEETING" | "BREAK" | "FREE";

function stateForMode(mode: "WORK" | "MEETING" | "BREAK"): AgentState {
  if (mode === "WORK") return "WORKING";
  if (mode === "MEETING") return "MEETING";
  return "BREAK";
}

/** Where agent index `i` belongs for WORK/MEETING/BREAK — always 1:1, never shared. FREE mode
 * has no single deterministic destination (see pickFreeRoamWaypoint), so it's handled
 * separately in setOfficeMode below rather than through this lookup. */
function destinationForMode(index: number, mode: "WORK" | "MEETING" | "BREAK"): WaypointId {
  if (mode === "WORK") return AGENTS[index].workstationId;
  if (mode === "MEETING") return MEETING_SEAT_WAYPOINTS[index];
  return BREAK_WAYPOINTS[index];
}

export interface AgentRuntime {
  position: [number, number, number];
  rotationY: number;
  state: AgentState;
  /** Human-readable current activity, shown in the info panel while WORKING. */
  task: string | null;
  currentWaypoint: WaypointId;
  /** Where this agent is walking to right now — null once arrived/idle. */
  targetWaypoint: WaypointId | null;
  /**
   * True while a real task is in flight for this agent (see TaskAssignmentPanel). Mirrors
   * LocalPageBackend's AgentSimulationService.ManualOverride flag exactly: while set,
   * AgentSimulationDriver's ambient wander/meeting/break scheduling leaves this agent alone
   * entirely, so a real assignment's state/task text can never get silently overwritten by the
   * next randomized decision tick.
   */
  manualOverride: boolean;
  /** Unix ms deadline for the current task, or null if it's untimed. Drives TaskTimer's
   * floating countdown (three/TaskTimer.tsx) — turns red and counts negative once passed. */
  taskDeadline: number | null;
}

interface OfficeState {
  agents: Record<AgentId, AgentRuntime>;
  selectedAgentId: AgentId | null;
  /** The office-wide mode driven by ModeControlPanel's four buttons. */
  officeMode: OfficeMode;
  /**
   * A task queued for an agent who isn't at their desk yet — set by taskAssignment.ts's
   * dispatchTaskViaChat (ChatPanel/Natali's delegation flow) when the target agent needs to walk
   * home first. AgentSimulationDriver checks this the moment that agent's walk lands them back
   * on their own workstation waypoint, and hands it straight to assignTask instead of the usual
   * random sample task — so "make them walk to their desk" and "start the real task" chain
   * together correctly regardless of where the agent was standing when Natali dispatched them.
   */
  pendingTasks: Partial<Record<AgentId, { task: string; timeLimitMinutes?: number }>>;

  selectAgent: (id: AgentId | null) => void;
  setAgentState: (id: AgentId, state: AgentState, task?: string | null) => void;
  setAgentTarget: (id: AgentId, waypointId: WaypointId | null) => void;
  setManualOverride: (id: AgentId, manualOverride: boolean) => void;
  setTaskDeadline: (id: AgentId, deadline: number | null) => void;
  setPendingTask: (id: AgentId, payload: { task: string; timeLimitMinutes?: number } | null) => void;
  /**
   * Switches the whole office's mode and immediately sends every eligible agent walking toward
   * its destination for that mode (own workstation for WORK, assigned chair for MEETING, own
   * break spot for BREAK, a random bed-or-break-spot for FREE) — button click to "everyone
   * starts walking" happens in this single synchronous update; AgentSimulationDriver's
   * per-frame movement code carries them the rest of the way and flips their state on arrival.
   * Agents currently pinned by a real task (manualOverride) are skipped — an in-flight backend
   * call always outranks a mode switch.
   */
  setOfficeMode: (mode: OfficeMode) => void;
  /**
   * Imperative, per-frame position/rotation write. Deliberately NOT meant to be consumed via a
   * reactive `useOfficeStore(s => s.agents[id].position)` selector anywhere — that would
   * re-render React on every animation frame for no benefit. Consumers that need live transform
   * (AgentController's mesh) call `useOfficeStore.getState().agents[id]` inside their own
   * useFrame instead, which is a plain read with zero subscription cost. Reactive selectors are
   * fine (and intended) for the low-frequency fields: state/task/selectedAgentId.
   */
  setAgentTransform: (id: AgentId, position: [number, number, number], rotationY: number) => void;
}

function initialAgents(): Record<AgentId, AgentRuntime> {
  const entries = AGENTS.map((agent) => {
    const home = WAYPOINTS[agent.workstationId];
    const runtime: AgentRuntime = {
      position: home.position,
      rotationY: home.rotationY,
      // Natali starts (and stays) in her own MANAGING state rather than WORKING — she isn't
      // cycling through sample tasks like the other 6, she's just running the office.
      state: agent.centralManager ? "MANAGING" : "WORKING",
      task: agent.sampleTasks[0] ?? null,
      currentWaypoint: agent.workstationId,
      targetWaypoint: null,
      manualOverride: false,
      taskDeadline: null,
    };
    return [agent.id, runtime] as const;
  });
  return Object.fromEntries(entries) as Record<AgentId, AgentRuntime>;
}

export const useOfficeStore = create<OfficeState>((set) => ({
  agents: initialAgents(),
  selectedAgentId: null,
  officeMode: "WORK",
  pendingTasks: {},

  selectAgent: (id) => set({ selectedAgentId: id }),

  setOfficeMode: (mode) =>
    set((store) => {
      const nextAgents = { ...store.agents };

      AGENTS.forEach((agent, index) => {
        const runtime = nextAgents[agent.id];
        if (runtime.manualOverride) return; // an in-flight real task always wins
        // Natali never wanders — she manages the office from her central desk regardless of
        // which global mode (Work/Meeting/Break/Free) the rest of the team is in. Checked before
        // any index-based lookup below (destinationForMode, pickFreeRoamWaypoint) since those
        // arrays are only 6 long and index-matched to the other 6 agents, not to her.
        if (agent.centralManager) return;

        if (mode === "FREE") {
          const { waypointId, state } = pickFreeRoamWaypoint(index);
          if (runtime.currentWaypoint === waypointId && !runtime.targetWaypoint) {
            nextAgents[agent.id] = { ...runtime, state };
            return;
          }
          nextAgents[agent.id] = { ...runtime, targetWaypoint: waypointId, state: "WALKING" };
          return;
        }

        const destination = destinationForMode(index, mode);
        if (runtime.currentWaypoint === destination && !runtime.targetWaypoint) {
          // Already exactly there (e.g. clicking "Work Time" again) — just make sure the
          // visible state/task matches immediately instead of waiting on a no-op walk.
          nextAgents[agent.id] = {
            ...runtime,
            state: stateForMode(mode),
            task: mode === "WORK" ? agent.sampleTasks[0] : runtime.task,
          };
          return;
        }

        nextAgents[agent.id] = { ...runtime, targetWaypoint: destination, state: "WALKING" };
      });

      useActivityLogStore.getState().log(`> Office mode switched to ${mode} — all agents heading out`);
      return { officeMode: mode, agents: nextAgents };
    }),

  setAgentState: (id, state, task) =>
    set((store) => ({
      agents: {
        ...store.agents,
        [id]: {
          ...store.agents[id],
          state,
          task: task === undefined ? store.agents[id].task : task,
        },
      },
    })),

  setAgentTarget: (id, waypointId) =>
    set((store) => ({
      agents: {
        ...store.agents,
        [id]: { ...store.agents[id], targetWaypoint: waypointId },
      },
    })),

  setManualOverride: (id, manualOverride) =>
    set((store) => ({
      agents: {
        ...store.agents,
        [id]: { ...store.agents[id], manualOverride },
      },
    })),

  setTaskDeadline: (id, deadline) =>
    set((store) => ({
      agents: {
        ...store.agents,
        [id]: { ...store.agents[id], taskDeadline: deadline },
      },
    })),

  setPendingTask: (id, payload) =>
    set((store) => ({
      pendingTasks: { ...store.pendingTasks, [id]: payload ?? undefined },
    })),

  setAgentTransform: (id, position, rotationY) =>
    set((store) => ({
      agents: {
        ...store.agents,
        [id]: { ...store.agents[id], position, rotationY },
      },
    })),
}));

// ── Future AI integration ───────────────────────────────────────────────────────────────
// This store is exactly the seam a real backend feed plugs into later. Today,
// AgentSimulationDriver (three/AgentSimulationDriver.tsx) is the only thing calling
// setAgentState/setAgentTarget, deciding behavior locally with simple timers. Once
// LocalPageBackend streams real agent.* events (see /api/agents/stream — already emitting
// Idle/Walking/Working for this same agent roster), replace the driver with an SSE/WebSocket
// subscription that maps each event straight onto these same setters, e.g.:
//
//   source.addEventListener("agent.changed_state", (e) => {
//     const { agentId, state, task } = JSON.parse(e.data);
//     useOfficeStore.getState().setAgentState(agentId, state, task);
//   });
//
// No 3D component needs to change — they already only read from this store.
