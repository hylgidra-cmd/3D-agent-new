import { AGENTS_BY_ID, type AgentId } from "../data/agents";
import { useOfficeStore } from "../store/officeStore";
import { useTaskHistoryStore } from "../store/taskHistoryStore";
import { useActivityLogStore } from "../store/activityLogStore";
import { useChatStore } from "../store/chatStore";
import { useI18nStore } from "../store/i18nStore";

const API_URLS = [
  import.meta.env.VITE_API_URL,
  "http://localhost:5278/api/agents/work",
  "http://localhost:5080/api/agents/work",
].filter(Boolean) as string[];

// All six office agents have registered IAgentWorkProviders in LocalPageBackend!
export const REAL_BACKEND_AGENT_IDS: AgentId[] = [
  "Frontend",
  "Backend",
  "UI_UX",
  "Graphic",
  "3D_Model",
  "Android_iOS"
];

export interface AssignTaskResult {
  ok: boolean;
  error?: string;
}

/** Arms/clears TaskTimer's floating 3D countdown (see officeStore's taskDeadline field). */
function armDeadline(agentId: AgentId, timeLimitMinutes: number | undefined) {
  if (timeLimitMinutes && timeLimitMinutes > 0) {
    useOfficeStore.getState().setTaskDeadline(agentId, Date.now() + timeLimitMinutes * 60_000);
  }
}

/**
 * The real backend integration — pins the agent, shows it WORKING on the real task text in the
 * 3D scene, optionally arms a countdown, calls LocalPageBackend, downloads the resulting ZIP,
 * records it in Task History, and always releases the pin. Shared by TaskAssignmentPanel
 * (direct manual assignment) and ManagerPanel (routed through the Manager) so the two flows
 * can never drift out of sync on what "assigning a real task" actually does.
 */
export async function assignRealTask(
  agentId: AgentId,
  task: string,
  timeLimitMinutes?: number,
): Promise<AssignTaskResult> {
  const store = useOfficeStore.getState();
  const log = useActivityLogStore.getState().log;
  const agentName = AGENTS_BY_ID[agentId].personName;

  store.setManualOverride(agentId, true);
  store.setAgentState(agentId, "WORKING", task);
  armDeadline(agentId, timeLimitMinutes);
  log(`> ${agentName} received a real task: "${task}"${timeLimitMinutes ? ` (limit: ${timeLimitMinutes}m)` : ""}`);

  try {
    let response: Response | null = null;
    let lastError: Error | null = null;

    for (const url of API_URLS) {
      try {
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, task }),
        });
        if (response.ok) break;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
      }
    }

    if (!response || !response.ok) {
      const statusText = response ? `${response.status} ${response.statusText}` : lastError?.message || "Connection refused";
      throw new Error(`Agent backend error: ${statusText}`);
    }

    const blob = await response.blob();
    const filename = `${agentId}-result.zip`;
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);

    useTaskHistoryStore.getState().addCompletedTask({ agentId, task, completedAt: Date.now(), filename, blob });
    log(`> ${agentName} finished the task — ZIP ready in Task History`);

    const isUz = useI18nStore.getState().locale === "uz";
    useChatStore.getState().addNataliMessage(
      isUz
        ? `🎉 ${agentName} ("${agentId}") o'z vazifasini muvaffaqiyatli yakunladi!\n📦 "${task}" loyihasi tayyor va "${filename}" avtomatik yuklab olindi.`
        : `🎉 ${agentName} (${agentId}) successfully finished their task!\n📦 Project for "${task}" is ready and "${filename}" has been downloaded.`
    );

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not reach the agent backend. Is it running?";
    log(`> ${agentName} hit an error: ${message}`);

    const isUz = useI18nStore.getState().locale === "uz";
    useChatStore.getState().addNataliMessage(
      isUz
        ? `⚠️ ${agentName} ("${agentId}") vazifani bajarishda muammoga duch keldi: ${message}`
        : `⚠️ ${agentName} (${agentId}) encountered an error: ${message}`
    );

    return { ok: false, error: message };
  } finally {
    store.setManualOverride(agentId, false);
    store.setTaskDeadline(agentId, null);
  }
}

/**
 * For the three agents with no live backend generator yet (Graphic/3D_Model/Android_iOS —
 * see REAL_BACKEND_AGENT_IDS) — a clearly-labeled LOCAL VISUAL SIMULATION, not a fake claim of
 * real generation: pins the agent WORKING on the task text for a few seconds, then releases it.
 * No network call, no ZIP, no Task History entry — there's genuinely nothing to download yet.
 */
export function assignSimulatedTask(agentId: AgentId, task: string, timeLimitMinutes?: number) {
  const store = useOfficeStore.getState();
  const log = useActivityLogStore.getState().log;
  const agentName = AGENTS_BY_ID[agentId].personName;

  store.setManualOverride(agentId, true);
  store.setAgentState(agentId, "WORKING", task);
  armDeadline(agentId, timeLimitMinutes);
  log(
    `> ${agentName} started: "${task}" (visual simulation only — no live backend generator for this role yet)`,
  );

  const simulatedDurationMs = 8000 + Math.random() * 6000;
  window.setTimeout(() => {
    log(`> ${agentName} finished: "${task}"`);
    useOfficeStore.getState().setManualOverride(agentId, false);
    useOfficeStore.getState().setTaskDeadline(agentId, null);
  }, simulatedDurationMs);
}

/** Dispatches to whichever of the two flows above is actually appropriate for this agent. */
export function assignTask(agentId: AgentId, task: string, timeLimitMinutes?: number) {
  if (REAL_BACKEND_AGENT_IDS.includes(agentId)) {
    return assignRealTask(agentId, task, timeLimitMinutes);
  }
  assignSimulatedTask(agentId, task, timeLimitMinutes);
  return Promise.resolve<AssignTaskResult>({ ok: true });
}

/**
 * Natali's own delegation flow (ChatPanel) — the one difference from the direct
 * TaskAssignmentPanel/ManagerPanel flows above: it physically sends the agent back to their own
 * desk first if they aren't already there (mid-walk, in a meeting, on break, asleep — wherever
 * the ambient simulation had them), THEN starts the real task once they arrive, rather than just
 * flipping their state in place. See officeStore's `pendingTasks` field and
 * AgentSimulationDriver's arrival handling for the other half of this handshake.
 */
export function dispatchTaskViaChat(agentId: AgentId, task: string, timeLimitMinutes?: number) {
  const store = useOfficeStore.getState();
  const agent = AGENTS_BY_ID[agentId];
  const runtime = store.agents[agentId];

  // Clear any stale countdown from a previous task before redirecting them — armDeadline only
  // sets a NEW deadline when one is given, so an old one would otherwise linger on screen.
  store.setTaskDeadline(agentId, null);

  const alreadyAtDesk = runtime.currentWaypoint === agent.workstationId && !runtime.targetWaypoint;
  if (alreadyAtDesk) {
    assignTask(agentId, task, timeLimitMinutes);
    return;
  }

  store.setManualOverride(agentId, false); // release any prior pin so the walk can actually happen
  store.setPendingTask(agentId, { task, timeLimitMinutes });
  store.setAgentTarget(agentId, agent.workstationId);
  store.setAgentState(agentId, "WALKING");
  useActivityLogStore
    .getState()
    .log(`> Natali is sending ${agent.personName} back to their desk for a new task`);
}

// ── The Manager's keyword router ────────────────────────────────────────────────────────
// A real, honest client-side router — NOT a claim of LLM-based routing. Simple substring
// matching against each role's actual specialty, checked in order; first match wins. Keywords
// are bilingual (EN + UZ) in one list, same pattern as chatRouter.ts's AGENT_MENTION_KEYWORDS —
// matching is just a substring check, so it works regardless of which language the text is in.
const ROUTING_RULES: Array<{ agentId: AgentId; keywords: string[] }> = [
  {
    agentId: "Graphic",
    keywords: ["logo", "illustration", "brand", "icon", "banner", "graphic", "artwork", "logotip", "brend", "rasm"],
  },
  {
    agentId: "UI_UX",
    keywords: ["wireframe", "ux", "user flow", "usability", "prototype", "figma", "layout", "prototip", "interfeys"],
  },
  {
    agentId: "3D_Model",
    keywords: ["3d", "model", "mesh", "texture", "asset", "environment", "render"],
  },
  {
    agentId: "Android_iOS",
    keywords: ["mobile", "android", "ios", "app store", "swift", "kotlin", "mobil", "ilova"],
  },
  {
    agentId: "Backend",
    keywords: ["backend", "api", "database", "server", "auth", "endpoint", "sql", "schema", "baza"],
  },
  {
    agentId: "Frontend",
    keywords: ["frontend", "react", "component", "css", "page", "website", "dashboard", "ui", "sahifa", "veb-sayt"],
  },
];

/** The keyword match alone, with no fallback — null when nothing matched. Used by chatRouter.ts
 * to tell "confidently routed" apart from "no idea what this is", so an unclear/conversational
 * chat message never gets silently mis-dispatched to whatever the fallback happens to be. */
export function matchAgentByKeywords(commandText: string): AgentId | null {
  const lower = commandText.toLowerCase();
  for (const rule of ROUTING_RULES) {
    if (rule.keywords.some((keyword) => lower.includes(keyword))) return rule.agentId;
  }
  return null;
}

/** Picks the best-matching agent for a free-text command — used by ManagerPanel, which (unlike
 * ChatPanel) always treats its input as a task to assign, so a guaranteed fallback here is the
 * right contract. Falls back to Frontend (the most general-purpose, product-facing role) when
 * nothing matches. */
export function routeTaskToAgent(commandText: string): AgentId {
  return matchAgentByKeywords(commandText) ?? "Frontend";
}
