import { useEffect, useRef } from "react";
import { fetchBestCover } from "./googleBooks";
import { repo } from "@/sync/repo";
import { syncOnce } from "@/sync/syncEngine";
import type { Book } from "@/sync/types";

// Process-wide "already tried" set so a book that failed to resolve in this
// session isn't hammered repeatedly. Keyed by book id.
const attempted = new Set<string>();

// Small concurrency limiter — Google Books rate-limits anonymous callers
// fairly aggressively. 2 in flight is a safe default.
const MAX_CONCURRENT = 2;

const mapLimit = async <T>(
  items: T[],
  limit: number,
  worker: (t: T) => Promise<void>,
): Promise<void> => {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor;
      cursor += 1;
      try {
        await worker(items[idx]);
      } catch (e) {
        // Individual failures are already logged inside fetchBestCover.
        void e;
      }
    }
  });
  await Promise.all(runners);
};

/**
 * Look up missing covers for books in the background.
 *
 * Triggered on mount (e.g. when the Library page opens) and whenever the
 * passed book list changes. Non-blocking — the UI renders placeholders
 * immediately and covers pop in as Google responds.
 *
 * @param books list of books currently shown
 * @param onUpdated called after any book is successfully updated so the UI
 *                  can refresh (typically a useQuotes-style refetch)
 */
export const useEnsureCovers = (
  books: Book[] | null | undefined,
  onUpdated?: () => void,
) => {
  // Latest onUpdated without retriggering the effect on every render.
  const onUpdatedRef = useRef(onUpdated);
  onUpdatedRef.current = onUpdated;

  useEffect(() => {
    if (!books || books.length === 0) return;
    const targets = books.filter(
      (b) => !b.cover_url && b.title.trim() && !attempted.has(b.id),
    );
    if (targets.length === 0) return;

    const ac = new AbortController();
    let cancelled = false;
    let changed = 0;

    void mapLimit(targets, MAX_CONCURRENT, async (book) => {
      if (cancelled) return;
      attempted.add(book.id);
      const result = await fetchBestCover(book.title, book.author, {
        signal: ac.signal,
      });
      if (cancelled) return;
      if (!result) {
        // Release the attempted lock so a future mount (e.g. reopening
        // Library after adding more context like author) can retry.
        attempted.delete(book.id);
        return;
      }
      await repo.updateBookCover(book.id, result.coverUrl, result.isbn);
      changed += 1;
    }).then(() => {
      if (cancelled) return;
      if (changed > 0) {
        // Fire once at the end instead of per-book to avoid UI thrash.
        onUpdatedRef.current?.();
        // Piggy-back a sync so the cover URL lands on Supabase too.
        void syncOnce();
      }
    });

    return () => {
      cancelled = true;
      ac.abort();
    };
    // Re-run when the set of book ids changes (new book added, etc.).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books?.map((b) => b.id).join("|")]);
};

/** Imperative helper — fetch a cover for one specific book right now. */
export const ensureCoverForBook = async (book: Book): Promise<boolean> => {
  if (book.cover_url || !book.title.trim()) return false;
  if (attempted.has(book.id)) return false;
  attempted.add(book.id);
  const result = await fetchBestCover(book.title, book.author);
  if (!result) {
    attempted.delete(book.id);
    return false;
  }
  await repo.updateBookCover(book.id, result.coverUrl, result.isbn);
  void syncOnce();
  return true;
};
