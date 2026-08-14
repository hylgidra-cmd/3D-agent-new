import { AGENTS_BY_ID, agentText } from "../data/agents";
import { useTaskHistoryStore, type CompletedTask } from "../store/taskHistoryStore";
import { useTranslation } from "../i18n/useTranslation";

export interface TaskHistoryPanelProps {
  open: boolean;
  onClose: () => void;
}

function triggerDownload(record: CompletedTask) {
  // A fresh object URL per click rather than keeping one alive for the record's whole
  // lifetime — cheap to create, and immediately revoked once the browser has grabbed it.
  const url = URL.createObjectURL(record.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = record.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * The "Task History" tab — every task that finished successfully through TaskAssignmentPanel,
 * newest first, with a one-click re-download of its generated ZIP (the Blob itself is kept in
 * useTaskHistoryStore for the session, so this doesn't need to re-call the backend). Same
 * non-blocking slide-over treatment as AgentsDirectory — occupies the same screen slot since
 * the two tabs are mutually exclusive.
 */
export default function TaskHistoryPanel({ open, onClose }: TaskHistoryPanelProps) {
  const completedTasks = useTaskHistoryStore((s) => s.completedTasks);
  const { t, locale } = useTranslation();

  return (
    <aside
      className={`glass-panel pointer-events-auto fixed right-4 top-20 bottom-6 z-20 w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl shadow-black/40 transition-transform duration-300 ease-out ${
        open ? "translate-x-0" : "pointer-events-none translate-x-[120%]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">{t("taskHistory.title")}</h2>
          <p className="text-[11px] text-white/40">{t("taskHistory.completedThisSession", { count: completedTasks.length })}</p>
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
        {completedTasks.length === 0 ? (
          <p className="p-4 text-center text-xs leading-relaxed text-white/40">{t("taskHistory.empty")}</p>
        ) : (
          completedTasks.map((record) => {
            const agent = AGENTS_BY_ID[record.agentId];
            return (
              <div key={record.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: agent.color }} />
                  <span className="truncate text-xs font-medium text-white">{agentText(agent.id, locale).name}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-white/35">
                    {new Date(record.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs text-white/70">{record.task}</p>
                <button
                  type="button"
                  onClick={() => triggerDownload(record)}
                  className="mt-2 flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/20 active:scale-[0.98]"
                >
                  <span aria-hidden>⬇</span>
                  {record.filename}
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
