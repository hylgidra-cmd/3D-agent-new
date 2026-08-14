import { AGENT_STATE_DOT_CLASS, agentStateLabel, AGENTS_BY_ID, agentText, locationLabel } from "../data/agents";
import { useOfficeStore } from "../store/officeStore";
import { useTourStore } from "../store/tourStore";
import { useTranslation } from "../i18n/useTranslation";

/**
 * Compact selection panel — appears only when an agent is clicked (see AgentController's
 * onClick -> selectAgent). Click the agent again, click empty space, or the × here to dismiss.
 * Deliberately small: name, role, live state, current task/location — nothing that competes
 * with the 3D office itself for screen space. Hidden during a cinematic tour in favor of
 * TourOverlay's pipeline-role copy (a selection from before the tour started shouldn't linger
 * on screen underneath it).
 */
export default function AgentInfoPanel() {
  const selectedId = useOfficeStore((s) => s.selectedAgentId);
  const runtime = useOfficeStore((s) => (s.selectedAgentId ? s.agents[s.selectedAgentId] : null));
  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const touring = useTourStore((s) => s.active);

  const { t, locale } = useTranslation();

  if (!selectedId || !runtime || touring) return null;
  const agent = AGENTS_BY_ID[selectedId];
  const text = agentText(agent.id, locale);

  return (
    <div className="glass-panel pointer-events-auto w-72 rounded-2xl p-4 shadow-2xl shadow-black/40">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/40">{text.role}</p>
          <h2 className="text-base font-semibold text-white">{agent.personName}</h2>
        </div>
        <button
          type="button"
          onClick={() => selectAgent(null)}
          aria-label={t("common.close")}
          className="rounded-md p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-white/55">{text.summary}</p>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${AGENT_STATE_DOT_CLASS[runtime.state]}`} style={{ boxShadow: `0 0 8px 1px currentColor` }} />
        <span className="text-xs font-medium text-white/85">{agentStateLabel(runtime.state, locale)}</span>
        <span className="ml-auto text-[11px] text-white/40">{locationLabel(runtime.currentWaypoint, locale)}</span>
      </div>

      {runtime.task && (
        <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-white/35">{t("agentInfo.currentActivity")}</p>
          <p className="mt-0.5 text-xs text-white/80">{runtime.task}</p>
        </div>
      )}
    </div>
  );
}
