import { AGENTS } from "../data/agents";
import { useTourStore } from "../store/tourStore";
import { useTranslation } from "../i18n/useTranslation";
import { LOCALES } from "../i18n/translations";
import type { TranslationKey } from "../i18n/translations";
import AudioPlayer from "./AudioPlayer";
import PlanBadge from "./PlanBadge";
import RoiWidget from "./RoiWidget";

export type HeaderTab = "office" | "directory" | "history" | "manager";

const TABS: Array<{ id: HeaderTab; labelKey: TranslationKey }> = [
  { id: "office", labelKey: "header.tab.office" },
  { id: "manager", labelKey: "header.tab.manager" },
  { id: "directory", labelKey: "header.tab.directory" },
  { id: "history", labelKey: "header.tab.history" },
];

export interface HeaderProps {
  activeTab: HeaderTab;
  onSelectTab: (tab: HeaderTab) => void;
}

/**
 * The app's top-level navigation — a full-width glassmorphism bar with the brand mark on the
 * left, the four section tabs, and the account/audio/tour/language controls on the right (wraps
 * onto a second line on narrow viewports rather than overflowing). Fixed at the very top, above
 * everything else; the 3D scene and every other panel are laid out to sit below it (App.tsx).
 *
 * Wired end-to-end through useTranslation() as the working proof of the i18n scaffold (see
 * i18n/translations.ts's architecture note) — tab labels, tagline, and the tour button all
 * switch with the language picker below, not just the picker itself.
 */
export default function Header({ activeTab, onSelectTab }: HeaderProps) {
  const touring = useTourStore((s) => s.active);
  const startTour = useTourStore((s) => s.start);
  const stopTour = useTourStore((s) => s.stop);
  const { t, locale, setLocale } = useTranslation();

  const handleTourClick = () => {
    if (touring) {
      stopTour();
      return;
    }
    onSelectTab("office"); // the tour needs the bare 3D view, not a Directory/History sidebar
    startTour();
  };

  return (
    <header className="glass-panel pointer-events-auto absolute inset-x-0 top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 shadow-inner shadow-white/20">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2 3 7l9 5 9-5-9-5Z" />
            <path d="M3 12l9 5 9-5" />
            <path d="M3 17l9 5 9-5" />
          </svg>
        </div>
        <div className="leading-tight">
          <h1 className="text-sm font-semibold tracking-tight text-white">AI Office</h1>
          <p className="text-[11px] text-emerald-300/90">
            {AGENTS.length} {t("header.tagline")}
          </p>
        </div>
      </div>

      <nav className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              aria-pressed={active}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition sm:px-3.5 ${
                active ? "bg-white/15 text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <RoiWidget />
        <PlanBadge />
        <AudioPlayer />

        {/* Language switcher — see i18n/translations.ts for what's wired through this yet */}
        <div className="flex items-center gap-0.5 rounded-xl bg-white/5 p-1">
          {LOCALES.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => setLocale(loc.id)}
              aria-pressed={locale === loc.id}
              className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                locale === loc.id ? "bg-white/15 text-white" : "text-white/45 hover:text-white/75"
              }`}
            >
              {loc.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleTourClick}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-lg transition active:scale-[0.98] ${
            touring
              ? "bg-red-500/90 text-white shadow-red-900/30 hover:bg-red-500"
              : "bg-gradient-to-br from-sky-400 to-violet-500 text-white shadow-black/30 hover:brightness-110"
          }`}
        >
          {touring ? (
            <>
              <span className="h-2 w-2 rounded-sm bg-white" />
              {t("header.stopTour")}
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              {t("header.startTour")}
            </>
          )}
        </button>
      </div>
    </header>
  );
}
