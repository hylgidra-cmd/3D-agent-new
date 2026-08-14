import { useOfficeStore, type OfficeMode } from "../store/officeStore";
import { useTranslation } from "../i18n/useTranslation";
import type { TranslationKey } from "../i18n/translations";

const MODES: Array<{ id: OfficeMode; labelKey: TranslationKey; dot: string }> = [
  { id: "WORK", labelKey: "mode.work", dot: "bg-emerald-400" },
  { id: "MEETING", labelKey: "mode.meeting", dot: "bg-violet-400" },
  { id: "BREAK", labelKey: "mode.break", dot: "bg-sky-300" },
  { id: "FREE", labelKey: "mode.free", dot: "bg-indigo-300" },
];

/**
 * Global office-mode switch — four buttons, one office-wide state. Clicking one immediately
 * sends every agent (except one mid real-task, see officeStore's manualOverride) walking to its
 * destination for that mode: own desk for Work Time, assigned meeting chair for Meeting, own
 * break spot for Break, or a random bed-or-break-spot for Free (agents wander, sleep, or just
 * relax — see data/agents.ts's pickFreeRoamWaypoint). See useOfficeStore.setOfficeMode for the
 * actual dispatch. Labels follow the active locale (see i18n/useTranslation.ts) — previously
 * each button showed a fixed English label plus a fixed Uzbek gloss underneath regardless of
 * the language switcher; now there's a single label that actually follows EN/UZ.
 */
export default function ModeControlPanel() {
  const officeMode = useOfficeStore((s) => s.officeMode);
  const setOfficeMode = useOfficeStore((s) => s.setOfficeMode);
  const { t } = useTranslation();

  return (
    <div className="glass-panel pointer-events-auto flex items-center gap-1 rounded-2xl p-1.5 shadow-2xl shadow-black/40">
      {MODES.map((mode) => {
        const active = officeMode === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => setOfficeMode(mode.id)}
            aria-pressed={active}
            className={`flex min-w-[92px] flex-col items-center gap-0.5 rounded-xl px-4 py-2 transition ${
              active ? "bg-white/15 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/80"
            }`}
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <span className={`h-1.5 w-1.5 rounded-full ${active ? mode.dot : "bg-white/25"}`} />
              {t(mode.labelKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
