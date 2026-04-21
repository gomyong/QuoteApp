/**
 * App-wide language context.
 *
 * Responsibilities:
 *  - Load the user's preferred language from Capacitor Preferences on
 *    first mount (falls back to browser/OS locale on first launch).
 *  - Persist subsequent changes back to Preferences.
 *  - Keep `document.documentElement.lang` in sync so CSS `:lang(...)`
 *    selectors pick the right font stack (see src/index.css).
 *  - Expose a cheap `t(key, vars?)` translator that never throws — missing
 *    keys fall through to the default language, then to the raw key, so a
 *    typo never takes down a screen.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Preferences } from "@capacitor/preferences";
import {
  DEFAULT_LANGUAGE,
  STORAGE_KEY,
  detectBrowserLanguage,
  type Language,
} from "./config";
import { translations } from "./translations";

type Vars = Record<string, string | number>;

type Ctx = {
  lang: Language;
  setLanguage: (l: Language) => Promise<void>;
  t: (key: string, vars?: Vars) => string;
};

const LanguageContext = createContext<Ctx | null>(null);

const interpolate = (template: string, vars?: Vars): string => {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
};

const resolve = (lang: Language, key: string, vars?: Vars): string => {
  const primary = translations[lang]?.[key];
  const fallback = translations[DEFAULT_LANGUAGE]?.[key];
  const template = primary ?? fallback ?? key;
  return interpolate(template, vars);
};

const applyHtmlLang = (lang: Language) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
  }
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Language>(DEFAULT_LANGUAGE);
  // Track a "ready" state mostly so we don't paint UI with the wrong
  // language for one frame on cold start.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let chosen: Language = DEFAULT_LANGUAGE;
      try {
        const stored = await Preferences.get({ key: STORAGE_KEY });
        if (stored.value === "ko" || stored.value === "en" || stored.value === "ja") {
          chosen = stored.value;
        } else {
          chosen = detectBrowserLanguage();
        }
      } catch {
        chosen = detectBrowserLanguage();
      }
      if (cancelled) return;
      setLang(chosen);
      applyHtmlLang(chosen);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback(async (l: Language) => {
    setLang(l);
    applyHtmlLang(l);
    try {
      await Preferences.set({ key: STORAGE_KEY, value: l });
    } catch {
      // Preferences failures are non-fatal — worst case the user sees the
      // auto-detected language again on next launch.
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLanguage,
      t: (key, vars) => resolve(lang, key, vars),
    }),
    [lang, setLanguage],
  );

  // Hide children until we've resolved the persisted language (typically
  // <100ms). Prevents a flash of Korean for a user whose stored pref is JA.
  if (!ready) return null;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useTranslation = (): Ctx => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within <LanguageProvider>");
  }
  return ctx;
};
