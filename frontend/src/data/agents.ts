import { TRANSLATIONS, type Locale, type TranslationKey } from "../i18n/translations";

/**
 * Central data model for the office. Nothing in components/ hardcodes an agent — every
 * character, workstation, and label is driven from AGENTS below, so the roster can later be
 * replaced/streamed by a real backend feed (see the "future AI integration" note on
 * useOfficeStore) without touching any 3D component.
 */

// Mirrors LocalPageBackend's AgentSimulationService.Roster ids exactly (Services/
// AgentSimulationService.cs) — Graphic / UI_UX / 3D_Model / Frontend / Backend / Android_iOS —
// so that when the backend eventually pushes live agent.* events over /api/agents/stream, this
// office's agent ids already line up with no translation layer needed.
export type AgentId =
  | "Graphic"
  | "UI_UX"
  | "3D_Model"
  | "Frontend"
  | "Backend"
  | "Android_iOS"
  // The 7th, central agent — added after the original 6-agent backend roster (see comment
  // above), so she's never mistaken for one of LocalPageBackend's registered roles. Every
  // index-matched array below (MEETING_SEAT_WAYPOINTS, BREAK_WAYPOINTS, BED_WAYPOINTS,
  // RestRoom's per-column AGENTS[i] lookups) stays 6-long and untouched precisely because she's
  // appended at the END of AGENTS, not inserted among the original six.
  | "Natali";

export type AgentState =
  | "IDLE"
  | "WORKING"
  | "WALKING"
  | "MEETING"
  | "BREAK"
  | "SLEEP"
  // Natali's own base state — she runs the office from her central desk rather than "working"
  // on a task of her own. See AIAgent's `centralManager` field and officeStore/
  // AgentSimulationDriver's guards against ever moving her out of it.
  | "MANAGING";

// Every place an agent can be sent. Workstation ids and meeting-seat ids each match 1:1 with
// AGENTS (see MEETING_SEAT_WAYPOINTS); the six break-spot ids are likewise 1:1 with AGENTS via
// BREAK_WAYPOINTS — every global mode always gives each of the 6 agents its own distinct
// destination, so nobody ever gets sent to the exact same point as somebody else.
export type WaypointId =
  | "graphic-workstation"
  | "uiux-workstation"
  | "3d-workstation"
  | "frontend-workstation"
  | "backend-workstation"
  | "mobile-workstation"
  | "reception"
  | "meeting-room"
  | "meeting-seat-1"
  | "meeting-seat-2"
  | "meeting-seat-3"
  | "meeting-seat-4"
  | "meeting-seat-5"
  | "meeting-seat-6"
  | "lounge-1"
  | "lounge-2"
  | "lounge-3"
  | "lounge-4"
  | "lounge-5"
  | "lounge-6"
  | "central-desk"
  | "bed-1"
  | "bed-2"
  | "bed-3"
  | "bed-4"
  | "bed-5"
  | "bed-6"
  | "server-room";

export interface Waypoint {
  id: WaypointId;
  /** World-space [x, y, z] the agent's feet should stand at. */
  position: [number, number, number];
  /** Facing direction (radians around Y) once the agent arrives. */
  rotationY: number;
}

export interface AIAgent {
  id: AgentId;
  /** A proper personal first name — shown as the top line of the in-3D floating nameplate. */
  personName: string;
  name: string;
  role: string;
  /** One-line description of what this agent actually does — shown in the info panel. */
  summary: string;
  /** Where this role sits in the automated pipeline — shown by the "Start Tour" fly-through's
   * TourOverlay, deliberately distinct copy from `summary` (pitch-deck framing: what this agent
   * hands off to, and receives from, the rest of the team). */
  pipelineRole: string;
  /** Primary identity color — outfit, monitor glow, selection ring. */
  color: string;
  /** Secondary/accent color for the accessory + workstation trim. */
  accentColor: string;
  /** Hair color for the 3D character/avatar. Omitted for roles whose head accessory already
   * covers the head (Graphic's beret, Frontend's hoodie) so nothing clips through it. */
  hairColor?: string;
  workstationId: WaypointId;
  /** Sample task text shown while WORKING, cycled by the simulation driver. */
  sampleTasks: string[];
  /**
   * True for exactly one agent — Natali, the central Office Administrator. Flags her out of
   * every piece of ambient-roster logic that assumes "one of the 6 interchangeable specialists":
   * officeStore's setOfficeMode and AgentSimulationDriver's wander/dwell loop both skip an agent
   * with this set (she never leaves her desk), and PricingModal's à la carte grid excludes her
   * (she's the built-in manager, not a hireable specialist). Absent (falsy) for the other 6.
   */
  centralManager?: boolean;
}

export const AGENTS: AIAgent[] = [
  {
    id: "Graphic",
    personName: "Nora",
    name: "Graphic Designer",
    role: "Branding & Illustration",
    summary: "Creates visual concepts, illustrations, and brand identity assets.",
    pipelineRole:
      "Builds the visual identity — logos, illustrations, brand colors — that Frontend brings to life in the real product.",
    color: "#f97316",
    accentColor: "#fb923c",
    workstationId: "graphic-workstation",
    sampleTasks: ["Designing the new logo mark", "Illustrating onboarding graphics", "Building the brand color palette"],
  },
  {
    id: "UI_UX",
    personName: "Ethan",
    name: "UI/UX Designer",
    role: "Interface & Flow Design",
    summary: "Designs interfaces, UX flows, and application layouts.",
    pipelineRole:
      "Defines user flows and wireframes first, then hands off design specs to Graphic and Frontend to build.",
    color: "#a78bfa",
    accentColor: "#c4b5fd",
    hairColor: "#3b2a1a",
    workstationId: "uiux-workstation",
    sampleTasks: ["Wireframing the checkout flow", "Refining the dashboard layout", "Running a usability pass"],
  },
  {
    id: "3D_Model",
    personName: "Maya",
    name: "3D Model Designer",
    role: "3D Assets & Environments",
    summary: "Creates 3D models, game assets, and environment pieces.",
    pipelineRole:
      "Builds the 3D assets and environments — like this very office — that power the platform's visualization layer.",
    color: "#22d3ee",
    accentColor: "#67e8f9",
    hairColor: "#0e7490",
    workstationId: "3d-workstation",
    sampleTasks: ["Modeling the office fountain", "Retopologizing the character mesh", "Baking environment lightmaps"],
  },
  {
    id: "Frontend",
    personName: "Leo",
    name: "Frontend Developer",
    role: "React / Next.js",
    summary: "Builds websites and frontend architecture in React/Next.js.",
    pipelineRole:
      "Turns UI/UX and Graphic's designs into a real React interface, wired directly to Backend's live API.",
    color: "#38bdf8",
    accentColor: "#7dd3fc",
    workstationId: "frontend-workstation",
    sampleTasks: ["Building the dashboard UI", "Wiring up the 3D office camera", "Fixing a layout regression"],
  },
  {
    id: "Backend",
    personName: "Zara",
    name: "Backend Developer",
    role: "APIs & Infrastructure",
    summary: "Builds APIs, databases, authentication, and server architecture.",
    pipelineRole:
      "Powers the APIs, database, and auth every other agent's output ultimately runs on — the platform's foundation.",
    color: "#34d399",
    accentColor: "#6ee7b7",
    hairColor: "#1c1917",
    workstationId: "backend-workstation",
    sampleTasks: ["Designing the agents API", "Optimizing a database query", "Hardening auth middleware"],
  },
  {
    id: "Android_iOS",
    personName: "Kai",
    name: "Mobile Developer",
    role: "Android & iOS",
    summary: "Builds mobile applications for Android and iOS.",
    pipelineRole:
      "Adapts Frontend's components and Backend's API into a native experience for Android and iOS.",
    color: "#fb7185",
    accentColor: "#fda4af",
    hairColor: "#f59e0b",
    workstationId: "mobile-workstation",
    sampleTasks: ["Building the mobile nav", "Testing on-device performance", "Shipping the iOS release build"],
  },
  {
    id: "Natali",
    personName: "Natali",
    name: "Chief Project Manager",
    role: "Office Administrator",
    summary: "Runs the office day-to-day — delegates your requests to the right specialist and reports back on the whole team's progress.",
    pipelineRole:
      "Sits at the center of the pipeline — takes your request, routes it to the right specialist, and reports status back across the whole team.",
    color: "#2b2438",
    accentColor: "#e8c468",
    hairColor: "#241c17",
    workstationId: "central-desk",
    sampleTasks: ["Managing the office and coordinating the team"],
    centralManager: true,
  },
];

export const AGENTS_BY_ID: Record<AgentId, AIAgent> = Object.fromEntries(
  AGENTS.map((agent) => [agent.id, agent]),
) as Record<AgentId, AIAgent>;

/** The 6 routable engineering specialists — i.e. AGENTS minus Natali. Explicit curated list,
 * same pattern as taskAssignment.ts's REAL_BACKEND_AGENT_IDS and tourStore's TOUR_AGENT_ORDER —
 * used anywhere "the team Natali manages" needs to be enumerated without her included: the chat
 * status report, and PricingModal's à la carte agent grid. */
export const TEAM_AGENT_IDS: AgentId[] = ["Graphic", "UI_UX", "3D_Model", "Frontend", "Backend", "Android_iOS"];

// ── Floor plan ───────────────────────────────────────────────────────────────────────────
// Top-down layout (X right, Z toward the viewer/entrance):
//
//                              Z +14 (entrance)
//                         ┌─── RECEPTION ───┐
//                              Z  +6
//   AGENT WORKSPACE (X -19..-6) — one shared room, two facing columns of desks:
//     Column A (outer, faces +X): Graphic · UI/UX · 3D
//     Column B (inner, faces -X): Frontend · Backend · Mobile
//                                                    OPEN PLAZA (X -6..+18) — free space
//                    · Natali's central command desk at (-2, -2), facing the entrance —
//                      squarely between the workstation room's doorway (X=-6) and the
//                      meeting room's open frontage (Z≈-8) south of it.
//                    Z -6.5 ───────────────────────────
//   SERVER ROOM        MEETING ROOM          LOUNGE + KITCHEN
//   (X -18..-6)         (X -6..+6)              (X +6..+18)
//                              Z -16 (back wall)
//
// All six workstations were previously split across a left and a right wing; they now share
// one enclosed room on the left (see three/office/Structure.tsx's AGENT_ROOM_BOUNDS), freeing
// the whole right-of-center area as open floor.
export const WAYPOINTS: Record<WaypointId, Waypoint> = {
  "graphic-workstation": { id: "graphic-workstation", position: [-17, 0, 6], rotationY: Math.PI / 2 },
  "uiux-workstation": { id: "uiux-workstation", position: [-17, 0, 1], rotationY: Math.PI / 2 },
  "3d-workstation": { id: "3d-workstation", position: [-17, 0, -4], rotationY: Math.PI / 2 },
  "frontend-workstation": { id: "frontend-workstation", position: [-8, 0, 6], rotationY: -Math.PI / 2 },
  "backend-workstation": { id: "backend-workstation", position: [-8, 0, 1], rotationY: -Math.PI / 2 },
  "mobile-workstation": { id: "mobile-workstation", position: [-8, 0, -4], rotationY: -Math.PI / 2 },
  reception: { id: "reception", position: [0, 0, 11], rotationY: Math.PI },
  // Natali's desk — the office's 7th, central agent. Faces +Z (toward the entrance/reception),
  // so she reads the room from her desk with the workstations to her west and the meeting room
  // just south of her — genuinely "in the middle" of the office, not tucked in a corner.
  "central-desk": { id: "central-desk", position: [-2, 0, -2], rotationY: 0 },
  "meeting-room": { id: "meeting-room", position: [0, 0, -9], rotationY: 0 },
  "meeting-seat-1": { id: "meeting-seat-1", position: [-3.2, 0, -6.4], rotationY: Math.PI * 0.75 },
  "meeting-seat-2": { id: "meeting-seat-2", position: [0, 0, -6.4], rotationY: Math.PI },
  "meeting-seat-3": { id: "meeting-seat-3", position: [3.2, 0, -6.4], rotationY: Math.PI * 1.25 },
  "meeting-seat-4": { id: "meeting-seat-4", position: [-3.2, 0, -11.6], rotationY: Math.PI * 0.25 },
  "meeting-seat-5": { id: "meeting-seat-5", position: [0, 0, -11.6], rotationY: 0 },
  "meeting-seat-6": { id: "meeting-seat-6", position: [3.2, 0, -11.6], rotationY: -Math.PI * 0.25 },
  // Two seats per lounge sofa (each 1.6-unit sofa comfortably seats two) — real furniture
  // positions (see three/office/Lounge.tsx), not arbitrary points, so every one of the 6 agents
  // gets its own real seat in the SAME room on Break, instead of being scattered across the
  // lounge/kitchen/reception.
  "lounge-1": { id: "lounge-1", position: [9.7, 0, -6.5], rotationY: Math.PI / 2 },
  "lounge-2": { id: "lounge-2", position: [9.7, 0, -5.5], rotationY: Math.PI / 2 },
  "lounge-3": { id: "lounge-3", position: [12.3, 0, -6.5], rotationY: -Math.PI / 2 },
  "lounge-4": { id: "lounge-4", position: [12.3, 0, -5.5], rotationY: -Math.PI / 2 },
  "lounge-5": { id: "lounge-5", position: [10.2, 0, -4.5], rotationY: Math.PI },
  "lounge-6": { id: "lounge-6", position: [11.8, 0, -4.5], rotationY: Math.PI },
  // One bed per agent — real furniture positions matching three/office/RestRoom.tsx's two
  // bed columns exactly (Column A: Graphic/UI_UX/3D_Model at X=10; Column B: Frontend/Backend/
  // Android_iOS at X=16), used by the "Free" global mode (see officeStore's FREE OfficeMode).
  "bed-1": { id: "bed-1", position: [10, 0, 5], rotationY: Math.PI / 2 },
  "bed-2": { id: "bed-2", position: [10, 0, 1.5], rotationY: Math.PI / 2 },
  "bed-3": { id: "bed-3", position: [10, 0, -1.5], rotationY: Math.PI / 2 },
  "bed-4": { id: "bed-4", position: [16, 0, 5], rotationY: -Math.PI / 2 },
  "bed-5": { id: "bed-5", position: [16, 0, 1.5], rotationY: -Math.PI / 2 },
  "bed-6": { id: "bed-6", position: [16, 0, -1.5], rotationY: -Math.PI / 2 },
  "server-room": { id: "server-room", position: [-11, 0, -11], rotationY: 0 },
};

// Index-matched 1:1 with AGENTS, same pattern as MEETING_SEAT_WAYPOINTS/BREAK_WAYPOINTS.
export const BED_WAYPOINTS: WaypointId[] = ["bed-1", "bed-2", "bed-3", "bed-4", "bed-5", "bed-6"];

// Index-matched 1:1 with AGENTS — every agent always has its own dedicated meeting chair /
// break spot, so Meeting and Break modes never need seat-collision bookkeeping.
export const MEETING_SEAT_WAYPOINTS: WaypointId[] = [
  "meeting-seat-1",
  "meeting-seat-2",
  "meeting-seat-3",
  "meeting-seat-4",
  "meeting-seat-5",
  "meeting-seat-6",
];

export const BREAK_WAYPOINTS: WaypointId[] = [
  "lounge-1",
  "lounge-2",
  "lounge-3",
  "lounge-4",
  "lounge-5",
  "lounge-6",
];

/** The "Free" global mode's per-agent decision — genuinely unstructured (unlike WORK/MEETING/
 * BREAK's clean 1:1 destination), so this is a weighted coin flip rather than a fixed lookup.
 * Shared by officeStore's setOfficeMode (the immediate "everyone scatters" trigger) and
 * AgentSimulationDriver (what an agent does next once its current free-roam wander is done),
 * so the two can never disagree on what "Free" actually means. */
export function pickFreeRoamWaypoint(index: number): { waypointId: WaypointId; state: "SLEEP" | "BREAK" } {
  // ~40% head to bed and sleep, ~60% wander to a break spot and just relax — both are
  // explicitly "non-work" per the brief, deliberately excluding the workstation as a Free
  // destination so there's no ambiguity with WORK mode's own arrival-state logic.
  if (Math.random() < 0.4) {
    return { waypointId: BED_WAYPOINTS[index], state: "SLEEP" };
  }
  const otherSpots = BREAK_WAYPOINTS.filter((_, i) => i !== index);
  const spot = otherSpots[Math.floor(Math.random() * otherSpots.length)] ?? BREAK_WAYPOINTS[index];
  return { waypointId: spot, state: "BREAK" };
}

/** Locale-translated name/role/summary/pipelineRole for one agent — see i18n/translations.ts's
 * `agent.<id>.*` keys. AGENTS above keeps the English copy as the canonical data shape; this is
 * the overlay every component renders through so the roster re-labels itself when the language
 * switcher changes locale (i18nStore), the same pattern as useTranslation()'s `t()`. */
export function agentText(id: AgentId, locale: Locale) {
  const dict = TRANSLATIONS[locale];
  return {
    name: dict[`agent.${id}.name` as TranslationKey],
    role: dict[`agent.${id}.role` as TranslationKey],
    summary: dict[`agent.${id}.summary` as TranslationKey],
    pipelineRole: dict[`agent.${id}.pipelineRole` as TranslationKey],
  };
}

/** Human-readable label for the info panel's "Location" field, in the given locale. */
export function locationLabel(waypointId: WaypointId, locale: Locale): string {
  const dict = TRANSLATIONS[locale];
  if (waypointId.endsWith("-workstation")) {
    const agent = AGENTS.find((a) => a.workstationId === waypointId);
    const role = agent ? agentText(agent.id, locale).role.split(" ")[0] : "";
    return dict["location.workstationSuffix"].replace("{role}", role);
  }
  if (waypointId.startsWith("meeting-seat")) return dict["location.meetingRoom"];
  if (waypointId.startsWith("lounge")) return dict["location.lounge"];
  if (waypointId.startsWith("bed")) return dict["location.restArea"];
  const labels: Partial<Record<WaypointId, TranslationKey>> = {
    reception: "location.reception",
    "meeting-room": "location.meetingRoom",
    "server-room": "location.serverRoom",
    "central-desk": "location.centralDesk",
  };
  const key = labels[waypointId];
  return key ? dict[key] : waypointId;
}

// Shared status display — used by both AgentInfoPanel (3D-scene selection panel) and
// AgentsDirectory (header tab) so the two never drift out of sync on labels/colors. Locale-aware
// — see i18n/translations.ts's `agentState.*` keys.
export function agentStateLabel(state: AgentState, locale: Locale): string {
  return TRANSLATIONS[locale][`agentState.${state}` as TranslationKey];
}

export const AGENT_STATE_DOT_CLASS: Record<AgentState, string> = {
  IDLE: "bg-white/40",
  WORKING: "bg-emerald-400",
  WALKING: "bg-amber-300",
  MEETING: "bg-violet-400",
  SLEEP: "bg-indigo-300",
  BREAK: "bg-sky-300",
  MANAGING: "bg-yellow-300",
};
