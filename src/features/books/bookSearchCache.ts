/**
 * IndexedDB-backed cache for book-cover lookups.
 *
 * Deliberately stored in a *separate* IndexedDB (`quote-cache`) instead
 * of bolted onto the main `quote-app` database. Two reasons:
 *
 *   1. Bumping the main DB version would force every existing user
 *      through an `upgrade()` migration, which carries non-zero risk on
 *      a shipping app. A standalone DB has no such risk — if the cache
 *      ever needs to evolve, we just bump *its* version in isolation.
 *   2. Cache entries are throwaway. If anything goes wrong (corrupt
 *      data, quota exceeded, schema mismatch on an old build), we can
 *      blow the whole cache away without touching a single user note.
 *
 * Cache shape:
 *   - Keyed by a normalized `${title}|${author ?? ""}` so trivial
 *     casing/punctuation differences hit the same row.
 *   - Stores both positive (found a cover) and negative (no match)
 *     results — negative caching prevents repeated quota burn for
 *     books no upstream knows about. Negative TTL is shorter so a
 *     newly-published book that wasn't indexed today gets a fresh
 *     attempt next week.
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

const DB_NAME = "quote-cache";
const DB_VERSION = 1;
const STORE = "book_cover_lookup";

const TTL_HIT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const TTL_MISS_MS = 24 * 60 * 60 * 1000; // 1 day

export type BookCoverCacheEntry = {
  /** Cache key: `${normalizedTitle}|${normalizedAuthor}`. */
  key: string;
  /** When this entry was written (ms since epoch). */
  cachedAt: number;
  /** Null when no upstream produced a confident match. */
  result: { coverUrl: string; isbn: string | null; provider: string } | null;
};

interface CacheDB extends DBSchema {
  book_cover_lookup: {
    key: string;
    value: BookCoverCacheEntry;
  };
}

let dbPromise: Promise<IDBPDatabase<CacheDB>> | null = null;

const getDB = (): Promise<IDBPDatabase<CacheDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<CacheDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "key" });
        }
      },
    }).catch((e) => {
      // Some environments (private browsing, very old WebKit) refuse
      // to open IndexedDB at all. Returning a rejected promise here
      // would break every caller — we'd rather fall back to "no cache,
      // always hit upstream" so the feature degrades silently.
      console.warn("[bookCoverCache] open failed, disabling cache:", e);
      throw e;
    });
  }
  return dbPromise;
};

const normalizeKey = (title: string, author: string | null): string => {
  const t = title
    .toLowerCase()
    .replace(/[\s\u3000]+/g, " ")
    .replace(/["'“”‘’·,.:;!?\-–—()\[\]{}]/g, "")
    .trim();
  const a = (author ?? "")
    .toLowerCase()
    .replace(/[\s\u3000]+/g, " ")
    .replace(/["'“”‘’·,.:;!?\-–—()\[\]{}]/g, "")
    .trim();
  return `${t}|${a}`;
};

const isFresh = (entry: BookCoverCacheEntry): boolean => {
  const age = Date.now() - entry.cachedAt;
  const ttl = entry.result ? TTL_HIT_MS : TTL_MISS_MS;
  return age < ttl;
};

/**
 * Look up a cached cover. Resolves to:
 *   - `undefined` when the cache has no entry (caller should hit upstream).
 *   - `null` when we previously confirmed no cover exists (negative hit).
 *   - The cached result object when we have a positive hit.
 *
 * Any internal error degrades to `undefined` so the caller seamlessly
 * falls through to a live network call.
 */
export const getCachedCoverLookup = async (
  title: string,
  author: string | null,
): Promise<
  | undefined
  | null
  | { coverUrl: string; isbn: string | null; provider: string }
> => {
  try {
    const db = await getDB();
    const key = normalizeKey(title, author);
    const entry = await db.get(STORE, key);
    if (!entry) return undefined;
    if (!isFresh(entry)) {
      // Best-effort cleanup — if the delete fails (read-only mode etc.)
      // we still return undefined and let the caller refetch.
      try {
        await db.delete(STORE, key);
      } catch {
        /* ignore */
      }
      return undefined;
    }
    return entry.result;
  } catch (e) {
    console.warn("[bookCoverCache] read failed:", e);
    return undefined;
  }
};

/**
 * Persist a result. Errors are swallowed — the worst-case is we
 * just refetch on the next call, which is fine.
 */
export const setCachedCoverLookup = async (
  title: string,
  author: string | null,
  result: { coverUrl: string; isbn: string | null; provider: string } | null,
): Promise<void> => {
  try {
    const db = await getDB();
    await db.put(STORE, {
      key: normalizeKey(title, author),
      cachedAt: Date.now(),
      result,
    });
  } catch (e) {
    console.warn("[bookCoverCache] write failed:", e);
  }
};

/** Diagnostic helper for the Settings panel. */
export const clearCoverCache = async (): Promise<number> => {
  try {
    const db = await getDB();
    const all = await db.getAllKeys(STORE);
    const tx = db.transaction(STORE, "readwrite");
    await Promise.all(all.map((k) => tx.store.delete(k)));
    await tx.done;
    return all.length;
  } catch (e) {
    console.warn("[bookCoverCache] clear failed:", e);
    return 0;
  }
};
