import { AGENTS_BY_ID, agentText } from "../data/agents";
import { TOUR_AGENT_ORDER, useTourStore } from "../store/tourStore";
import { useTranslation } from "../i18n/useTranslation";
import AgentAvatar from "./AgentAvatar";

/**
 * The glassmorphism tooltip shown while the cinematic tour is paused on an agent — pipeline-role
 * copy (see data/agents.ts's pipelineRole field), not the generic status text AgentInfoPanel
 * shows for a manual click. Includes a step progress bar and a manual "stop tour" control so a
 * live demo can always be cut short cleanly.
 */
export default function TourOverlay() {
  const active = useTourStore((s) => s.active);
  const currentAgentId = useTourStore((s) => s.currentAgentId);
  const stepIndex = useTourStore((s) => s.stepIndex);
  const stop = useTourStore((s) => s.stop);
  const { t, locale } = useTranslation();

  if (!active || !currentAgentId) return null;
  const agent = AGENTS_BY_ID[currentAgentId];
  const text = agentText(currentAgentId, locale);

  return (
    <div className="glass-panel pointer-events-auto absolute left-1/2 top-24 z-30 w-full max-w-md -translate-x-1/2 rounded-2xl p-4 shadow-2xl shadow-black/40 sm:p-5">
      <div className="flex items-center gap-3">
        <AgentAvatar color={agent.color} accentColor={agent.accentColor} hairColor={agent.hairColor} size={48} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/40">
            {t("tour.stepOf", { step: stepIndex + 1, total: TOUR_AGENT_ORDER.length })}
          </p>
          <h2 className="truncate text-sm font-semibold text-white">
            {agent.personName} — {text.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={stop}
          aria-label={t("header.stopTour")}
          className="shrink-0 rounded-md p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-white/75">{text.pipelineRole}</p>

      <div className="mt-3 flex gap-1">
        {TOUR_AGENT_ORDER.map((id, i) => (
          <span
            key={id}
            className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
              i <= stepIndex ? "bg-white/70" : "bg-white/15"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
