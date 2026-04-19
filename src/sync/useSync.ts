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

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user) return;
      await repo.assignOwnerToLocalRecords(user.id);
      if (!cancelled) await syncOnce();
    };
    run();
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
