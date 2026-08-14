import { useEffect, useRef, useState, type FormEvent } from "react";
import { AGENT_STATE_DOT_CLASS, agentStateLabel, agentText, AGENTS, AGENTS_BY_ID } from "../data/agents";
import { useOfficeStore } from "../store/officeStore";
import { useActivityLogStore } from "../store/activityLogStore";
import { assignTask, routeTaskToAgent, REAL_BACKEND_AGENT_IDS } from "../task/taskAssignment";
import { useTranslation } from "../i18n/useTranslation";
import AgentAvatar from "./AgentAvatar";

export interface ManagerPanelProps {
  open: boolean;
  onClose: () => void;
}

/**
 * The "Project Manager" — the sole communication bridge between the user and the six engineering
 * agents. You describe what you want in plain text; the Manager's keyword router (see
 * task/taskAssignment.ts's routeTaskToAgent — a real, honest client-side router, not a claim of
 * LLM-based routing) picks the best-matching agent and dispatches the same assignRealTask /
 * assignSimulatedTask flow TaskAssignmentPanel uses directly. Provides real-time reporting two
 * ways: a live per-agent status grid (what everyone is doing RIGHT NOW) and the shared activity
 * log (what's happened so far this session).
 */
export default function ManagerPanel({ open, onClose }: ManagerPanelProps) {
  const [command, setCommand] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [routingNote, setRoutingNote] = useState<string | null>(null);

  const lines = useActivityLogStore((s) => s.lines);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t, locale } = useTranslation();

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines, open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!command.trim()) return;

    const agentId = routeTaskToAgent(command);
    const agent = AGENTS_BY_ID[agentId];
    const agentName = agentText(agentId, locale).name;
    const isLive = REAL_BACKEND_AGENT_IDS.includes(agentId);
    const minutes = Number(timeLimit);
    const timeLimitMinutes = timeLimit.trim() && minutes > 0 ? minutes : undefined;

    setRoutingNote(
      t("manager.routedTo", { agent: agentName, suffix: isLive ? "" : t("manager.simulationOnly") }),
    );
    useActivityLogStore.getState().log(`> Manager: routing "${command}" → ${agent.name}`);

    assignTask(agentId, command, timeLimitMinutes);
    setCommand("");
    setTimeLimit("");
  };

  return (
    <aside
      className={`glass-panel pointer-events-auto fixed right-4 top-20 bottom-6 z-20 w-full max-w-md overflow-hidden rounded-2xl shadow-2xl shadow-black/40 transition-transform duration-300 ease-out ${
        open ? "translate-x-0" : "pointer-events-none translate-x-[120%]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">{t("manager.title")}</h2>
          <p className="text-[11px] text-white/40">{t("manager.subtitle")}</p>
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

      <div className="flex flex-col gap-3 overflow-y-auto p-3.5" style={{ maxHeight: "calc(100% - 57px)" }}>
        {/* Command input */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <textarea
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder={t("manager.commandPlaceholder")}
            rows={2}
            className="w-full resize-none rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/25"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              placeholder={t("manager.timeLimitPlaceholder")}
              className="w-24 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-white placeholder:text-white/25 outline-none focus:border-white/25"
            />
            <button
              type="submit"
              disabled={!command.trim()}
              className="flex-1 rounded-lg bg-gradient-to-br from-sky-400 to-violet-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-black/30 transition disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:brightness-110"
            >
              {t("manager.send")}
            </button>
          </div>
          {routingNote && <p className="text-[10.5px] text-white/50">{routingNote}</p>}
        </form>

        {/* Live per-agent status — "what each agent is currently doing" */}
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">{t("manager.teamStatus")}</p>
          <div className="flex flex-col gap-1.5">
            {AGENTS.map((agent) => (
              <ManagerAgentRow key={agent.id} agentId={agent.id} />
            ))}
          </div>
        </div>

        {/* Historical feed — "what each agent has done" */}
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">{t("manager.activityLog")}</p>
          <div
            ref={scrollRef}
            className="scrollbar-none h-32 overflow-y-auto rounded-xl border border-white/10 bg-black/30 px-2.5 py-2 font-mono text-[10px] leading-relaxed text-emerald-300/85"
          >
            {lines.length === 0 ? (
              <p className="text-white/30">{t("manager.noActivity")}</p>
            ) : (
              lines.map((line) => <p key={line.id}>{line.text}</p>)
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function ManagerAgentRow({ agentId }: { agentId: (typeof AGENTS)[number]["id"] }) {
  const agent = AGENTS_BY_ID[agentId];
  const runtime = useOfficeStore((s) => s.agents[agentId]);
  const { locale } = useTranslation();

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
      <AgentAvatar color={agent.color} accentColor={agent.accentColor} hairColor={agent.hairColor} size={28} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-white/90">{agent.personName}</p>
        <p className="truncate text-[10px] text-white/45">{runtime.task ?? agentStateLabel(runtime.state, locale)}</p>
      </div>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${AGENT_STATE_DOT_CLASS[runtime.state]}`} />
    </div>
  );
}
