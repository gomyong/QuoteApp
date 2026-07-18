import { useEffect } from "react";
import { syncOnce } from "./syncEngine";
import { useAuth } from "@/features/auth/AuthProvider";
import { repo } from "./repo";

/**
 * Mount once near the root.
 * Triggers a sync on:
 *  - app start (when user is signed in)
 *  - sign-in transition (and backfills user_id on local-only records)
 *  - window focus / online events
 */
export const useSync = () => {
  const { user } = useAuth();

  // One-shot dedupe at app boot. This runs regardless of auth state because
  // duplicates can accumulate in the local IndexedDB during offline use
  // (same title typed with/without author → two book rows).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const removed = await repo.dedupeBooks();
        if (!cancelled && removed > 0) {
          // If we merged anything, trigger a sync so the merged quote
          // records (now pointing at the winning book_id) propagate.
          await syncOnce();
        }
      } catch (e) {
        console.warn("[useSync] dedupeBooks failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user) return;
      const uid = user.id;
      await repo.assignOwnerToLocalRecords(uid);
      // Bail if the user changed / signed out while backfill was running.
      if (cancelled) return;
      await syncOnce();
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const onOnline = () => syncOnce();
    const onFocus = () => syncOnce();
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
};
