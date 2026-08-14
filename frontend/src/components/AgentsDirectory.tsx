import { AGENT_STATE_DOT_CLASS, agentStateLabel, agentText, AGENTS, type AIAgent } from "../data/agents";
import { useOfficeStore } from "../store/officeStore";
import { useTaskHistoryStore } from "../store/taskHistoryStore";
import { useTranslation } from "../i18n/useTranslation";
import AgentAvatar from "./AgentAvatar";

export interface AgentsDirectoryProps {
  open: boolean;
  onClose: () => void;
}

/**
 * The "Agents Directory" tab — a non-blocking slide-over (the 3D scene stays visible and
 * interactive behind/around it, there's no full-screen backdrop). Lists the full 6-agent
 * roster with a live status dot synced to useOfficeStore and a running "tasks completed" count
 * derived from useTaskHistoryStore — both update in real time as the office runs.
 */
export default function AgentsDirectory({ open, onClose }: AgentsDirectoryProps) {
  const { t } = useTranslation();
  return (
    <aside
      className={`glass-panel pointer-events-auto fixed right-4 top-20 bottom-6 z-20 w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl shadow-black/40 transition-transform duration-300 ease-out ${
        open ? "translate-x-0" : "pointer-events-none translate-x-[120%]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">{t("agentsDirectory.title")}</h2>
          <p className="text-[11px] text-white/40">{t("agentsDirectory.teamMembers", { count: AGENTS.length })}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="rounded-md p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="scrollbar-none flex flex-col gap-2 overflow-y-auto p-3" style={{ maxHeight: "calc(100% - 57px)" }}>
        {AGENTS.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </aside>
  );
}

function AgentCard({ agent }: { agent: AIAgent }) {
  const runtime = useOfficeStore((s) => s.agents[agent.id]);
  const tasksCompleted = useTaskHistoryStore(
    (s) => s.completedTasks.filter((task) => task.agentId === agent.id).length,
  );
  const { t, locale } = useTranslation();
  const text = agentText(agent.id, locale);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <AgentAvatar color={agent.color} accentColor={agent.accentColor} hairColor={agent.hairColor} size={52} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{agent.personName}</p>
        <p className="truncate text-[11px] text-white/45">{text.name}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${AGENT_STATE_DOT_CLASS[runtime.state]}`}
            style={{ boxShadow: "0 0 6px 1px currentColor" }}
          />
          <span className="text-[10px] text-white/50">{agentStateLabel(runtime.state, locale)}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-base font-semibold text-white">{tasksCompleted}</p>
        <p className="text-[9px] uppercase tracking-wide text-white/35">{t("agentsDirectory.tasksDone")}</p>
      </div>
    </div>
  );
}
