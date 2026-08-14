import { useTaskHistoryStore } from "../store/taskHistoryStore";
import { useTranslation } from "../i18n/useTranslation";

// Illustrative assumptions, shown transparently rather than presented as precise measurement —
// a vanity/ROI metric for the pitch, not a billing calculation.
const ASSUMED_HOURS_PER_TASK = 3;
const ASSUMED_HOURLY_RATE = 75;

/** A small "value delivered" stat — hours and dollars notionally saved by the completed tasks
 * this session, per the brief's ROI-widget ask. Deliberately labeled as an estimate. */
export default function RoiWidget() {
  const tasksCompleted = useTaskHistoryStore((s) => s.completedTasks.length);
  const hoursSaved = tasksCompleted * ASSUMED_HOURS_PER_TASK;
  const moneySaved = hoursSaved * ASSUMED_HOURLY_RATE;
  const { t } = useTranslation();

  return (
    <div
      className="flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-xs font-medium text-emerald-200"
      title={t("roi.tooltip", { hours: ASSUMED_HOURS_PER_TASK, rate: ASSUMED_HOURLY_RATE })}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" />
      </svg>
      {t("roi.saved", { hours: hoursSaved, money: moneySaved.toLocaleString() })}
    </div>
  );
}
