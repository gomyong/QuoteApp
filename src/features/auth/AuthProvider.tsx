import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";
import { wipeLocalData } from "@/sync/wipeLocalData";

/**
 * Magic-link callback URL.
 *   - Native: `app.quote.note://auth/callback` — Info.plist declares this
 *     URL scheme, DeepLinkHandler listens for it and recovers the session.
 *   - Web: current origin + `#/` so Supabase lands us back on the SPA.
 *
 * IMPORTANT: Both values must be whitelisted under
 *   Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
 * otherwise Supabase ignores the request and falls back to Site URL.
 *
 * Do NOT use `login-callback` — that string only existed in old docs and
 * does not match this app.
 */
const getEmailRedirectTo = (): string | undefined => {
  if (Capacitor.isNativePlatform()) return "app.quote.note://auth/callback";
  if (typeof window !== "undefined") return `${window.location.origin}/#/`;
  return undefined;
};

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  /**
   * Verify the numeric OTP code that Supabase includes in the same magic
   * link email (as `{{ .Token }}`). Works without deep links — the user
   * types the code in the app and we call Supabase directly. This is the
   * most reliable path on iOS because it bypasses URL scheme config
   * entirely.
   */
  verifyEmailOtp: (email: string, code: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /**
   * Permanently delete the signed-in account (server + storage) and wipe
   * local app data. Requires `public.delete_own_account()` migration.
   */
  deleteAccount: () => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted) setSession(data.session ?? null);
      } catch (e) {
        console.warn("[auth] getSession failed:", e);
      } finally {
        if (mounted) setLoading(false);
      }

      try {
        const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (mounted) setSession(nextSession);
        });
        unsub = () => data.subscription.unsubscribe();
      } catch (e) {
        console.warn("[auth] onAuthStateChange failed:", e);
      }
    })();

    return () => {
      mounted = false;
      unsub?.();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      async signInWithMagicLink(email: string) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: getEmailRedirectTo() },
        });
        return { error: error?.message ?? null };
      },
      async verifyEmailOtp(email: string, code: string) {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token: code.trim(),
          type: "email",
        });
        return { error: error?.message ?? null };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
      async deleteAccount() {
        const { error } = await supabase.rpc("delete_own_account");
        if (error) {
          return { error: error.message };
        }
        // Session is gone server-side; clear client + local stores.
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          /* ignore — user row may already be gone */
        }
        await wipeLocalData();
        // Open IDB handles may still point at deleted DBs — hard reload
        // guarantees a clean slate for the next session.
        if (typeof window !== "undefined") {
          window.location.hash = "#/";
          window.location.reload();
        }
        return { error: null };
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
