import { useI18nStore } from "../store/i18nStore";
import { TRANSLATIONS, type TranslationKey } from "./translations";

/** The hook every component wires strings through — `const { t } = useTranslation()`, then
 * `t("some.key")` instead of a hardcoded literal. Falls back to English if a key is ever missing
 * for the active locale (shouldn't happen since TRANSLATIONS is fully typed per locale, but kept
 * as a safe default rather than rendering `undefined`).
 *
 * Supports simple `{param}` interpolation for strings that embed a dynamic value (a name, a
 * count, a price) — pass a `params` object and every `{key}` placeholder in the translated
 * string is replaced with `String(value)`. */
export function useTranslation() {
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let text = TRANSLATIONS[locale][key] ?? TRANSLATIONS.en[key] ?? key;
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  };

  return { t, locale, setLocale };
}
