/**
 * App languages and helpers.
 *
 * Keep this list tightly coupled to the keys in `translations.ts` — adding
 * a new language here without adding its dict will fall through to the
 * default language at runtime (see LanguageProvider).
 */

export type Language = "ko" | "en";

export const LANGUAGES: Array<{
  code: Language;
  label: string;
  nativeLabel: string;
}> = [
  { code: "ko", label: "Korean", nativeLabel: "한국어" },
  { code: "en", label: "English", nativeLabel: "English" },
];

export const DEFAULT_LANGUAGE: Language = "ko";

export const STORAGE_KEY = "app.language";

/**
 * Infer the best starting language from the device / browser locale. Only
 * called once on very first launch (after that the user's stored preference
 * wins).
 */
export const detectBrowserLanguage = (): Language => {
  if (typeof navigator === "undefined") return DEFAULT_LANGUAGE;
  const locales = [
    navigator.language,
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
  ]
    .filter(Boolean)
    .map((l) => l.toLowerCase());
  for (const l of locales) {
    if (l.startsWith("en")) return "en";
    if (l.startsWith("ko")) return "ko";
  }
  return DEFAULT_LANGUAGE;
};
