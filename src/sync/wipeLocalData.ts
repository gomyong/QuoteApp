/**
 * Wipe all on-device Quote data (IndexedDB + Capacitor Preferences session
 * keys). Used after account deletion / sign-out so the next session cannot
 * see another user's local library.
 *
 * Language preference is intentionally kept — deleting an account / signing
 * out should not reset the UI language.
 */

import { Preferences } from "@capacitor/preferences";
import { resetDBHandle } from "./db";

const QUOTE_DB = "quote-app";
const CACHE_DB = "quote-cache";

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
  // Drop the open IDB handle first so deleteDatabase is less likely to block.
  await resetDBHandle();
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
  }
};
