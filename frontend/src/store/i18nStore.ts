import { create } from "zustand";
import type { Locale } from "../i18n/translations";

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

/** The single source of truth for the active locale — see i18n/translations.ts for the
 * dictionary and i18n/useTranslation.ts for the hook components actually call. */
export const useI18nStore = create<I18nState>((set) => ({
  locale: "en",
  setLocale: (locale) => set({ locale }),
}));
