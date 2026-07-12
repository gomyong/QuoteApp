/**
 * Wipe all on-device Quote data (IndexedDB + Capacitor Preferences session
 * keys). Used after account deletion so a fresh install-like state remains.
 *
 * Language preference is intentionally kept — deleting an account should
 * not reset the UI language.
 */

import { Preferences } from "@capacitor/preferences";

const QUOTE_DB = "quote-app";
const CACHE_DB = "quote-cache";

/** Preference keys that hold session / sync state (not language). */
const PREF_KEYS_TO_CLEAR = [
  "sb-*-auth-token", // pattern handled separately via keys() scan when available
];

const deleteDatabase = (name: string): Promise<void> =>
  new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve(); // best-effort
      req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });

export const wipeLocalData = async (): Promise<void> => {
  await Promise.all([deleteDatabase(QUOTE_DB), deleteDatabase(CACHE_DB)]);

  // Clear Capacitor Preferences except the language key.
  try {
    const { keys } = await Preferences.keys();
    const keep = new Set(["app.language"]);
    await Promise.all(
      keys.filter((k) => !keep.has(k)).map((k) => Preferences.remove({ key: k })),
    );
  } catch {
    // Fallback: ignore — auth signOut still clears the session client-side.
    void PREF_KEYS_TO_CLEAR;
  }
};
