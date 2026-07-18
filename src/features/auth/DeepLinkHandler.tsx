import { useEffect } from "react";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";

/**
 * Handle Supabase magic-link callbacks on iOS (and Android, eventually).
 *
 * Supabase sends the user to whatever `emailRedirectTo` we asked for. On
 * native we ask for `app.quote.note://auth/callback` (see SignIn page),
 * which iOS routes into our app via the CFBundleURLTypes entry in
 * Info.plist. Capacitor surfaces that as an `appUrlOpen` event.
 *
 * The URL Supabase generates looks like one of:
 *  - (PKCE)          app.quote.note://auth/callback?code=XYZ
 *  - (implicit/hash) app.quote.note://auth/callback#access_token=...&refresh_token=...
 *
 * We try both shapes so whichever Supabase decides to use, we recover the
 * session and the user lands logged-in without seeing the web fallback.
 */
const DeepLinkHandler = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    let handle: { remove: () => void | Promise<void> } | null = null;

    const consumeUrl = async (url: string) => {
      try {
        const u = new URL(url);
        // PKCE style: ?code=...
        const code = u.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(url);
          if (error) console.warn("[deeplink] exchangeCodeForSession failed:", error.message);
          else console.info("[deeplink] session established via PKCE");
          return;
        }
        // Implicit / hash style: #access_token=...&refresh_token=...
        const hash = u.hash.startsWith("#") ? u.hash.slice(1) : u.hash;
        if (hash) {
          const params = new URLSearchParams(hash);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) console.warn("[deeplink] setSession failed:", error.message);
            else console.info("[deeplink] session established via implicit flow");
            return;
          }
        }
        // Avoid logging full URLs — they may contain tokens.
        console.info("[deeplink] url received but no auth tokens");
      } catch (e) {
        console.warn("[deeplink] failed to consume url:", e);
      }
    };

    void (async () => {
      // Handle warm-open (app already running → switched-back via deep link).
      const listener = await CapApp.addListener("appUrlOpen", ({ url }) => {
        void consumeUrl(url);
      });
      if (cancelled) {
        void listener.remove();
        return;
      }
      handle = listener;

      // Handle cold-launch (link tapped while app was terminated).
      try {
        const launch = await CapApp.getLaunchUrl();
        if (!cancelled && launch?.url) void consumeUrl(launch.url);
      } catch (e) {
        console.warn("[deeplink] getLaunchUrl failed:", e);
      }
    })();

    return () => {
      cancelled = true;
      void handle?.remove();
    };
  }, []);

  return null;
};

export default DeepLinkHandler;
