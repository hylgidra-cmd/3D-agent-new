import { useEffect, useRef } from "react";
import { useActivityLogStore } from "../store/activityLogStore";
import { useTranslation } from "../i18n/useTranslation";

/**
 * A small semi-transparent terminal widget streaming what agents are actually doing right now
 * — AgentSimulationDriver, officeStore's setOfficeMode, and TaskAssignmentPanel all push lines
 * into useActivityLogStore; this just renders whatever's there and auto-scrolls to the newest
 * line. Purely a readout — no input, no interaction beyond scrolling.
 */
export default function ActivityFeed() {
  const lines = useActivityLogStore((s) => s.lines);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  return (
    <div className="glass-panel pointer-events-auto flex w-72 flex-col overflow-hidden rounded-xl shadow-2xl shadow-black/40 sm:w-80">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-red-400/70" />
        <span className="h-2 w-2 rounded-full bg-amber-400/70" />
        <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
        <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-white/40">{t("activityFeed.title")}</span>
      </div>
      <div
        ref={scrollRef}
        className="scrollbar-none h-28 overflow-y-auto bg-black/40 px-3 py-2 font-mono text-[10.5px] leading-relaxed text-emerald-300/90"
      >
        {lines.length === 0 ? (
          <p className="text-white/30">{t("activityFeed.waiting")}</p>
        ) : (
          lines.map((line) => (
            <p key={line.id} className="whitespace-pre-wrap break-words">
              {line.text}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
