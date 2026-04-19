import { createClient, type SupabaseClient as RawSupabaseClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

const capacitorStorage = {
  async getItem(key: string) {
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string) {
    try {
      await Preferences.set({ key, value });
    } catch {
      /* ignore */
    }
  },
  async removeItem(key: string) {
    try {
      await Preferences.remove({ key });
    } catch {
      /* ignore */
    }
  },
};

const safeCreateClient = (): RawSupabaseClient => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn("[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
    return createClient("https://placeholder.supabase.co", "placeholder-anon-key");
  }
  try {
    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: Capacitor.isNativePlatform()
          ? (capacitorStorage as unknown as Storage)
          : undefined,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: !Capacitor.isNativePlatform(),
        flowType: "pkce",
      },
    });
  } catch (e) {
    console.error("[supabase] createClient failed:", e);
    return createClient("https://placeholder.supabase.co", "placeholder-anon-key");
  }
};

export const supabase = safeCreateClient();

export type SupabaseClient = typeof supabase;
