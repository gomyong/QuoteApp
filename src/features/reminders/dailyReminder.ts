/**
 * Daily Quote Reminder scheduler.
 *
 * Schedules up to 14 days of upcoming local notifications using real quotes
 * from the user's library so every day's lock-screen drop shows an actual
 * underlined passage rather than generic reminder text.
 *
 * Native (iOS / Android): powered by @capacitor/local-notifications.
 * Web fallback: stores preferences and supports test preview notifications
 * via the browser Notification API when permitted.
 */

import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { repo } from "@/sync/repo";
import type { Book, Quote } from "@/sync/types";

export type ReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
  favoritesOnly: boolean;
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  hour: 9,
  minute: 0,
  favoritesOnly: false,
};

const STORAGE_KEY = "quote.reminder.v1";
const REMINDER_IDS = Array.from({ length: 14 }, (_, i) => 1001 + i);
const TEST_NOTIFICATION_ID = 1099;

export const loadReminderSettings = async (): Promise<ReminderSettings> => {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (!value) return DEFAULT_REMINDER_SETTINGS;
    const parsed = JSON.parse(value) as Partial<ReminderSettings>;
    return {
      enabled: Boolean(parsed.enabled),
      hour:
        typeof parsed.hour === "number" && parsed.hour >= 0 && parsed.hour <= 23
          ? parsed.hour
          : 9,
      minute:
        typeof parsed.minute === "number" &&
        parsed.minute >= 0 &&
        parsed.minute <= 59
          ? parsed.minute
          : 0,
      favoritesOnly: Boolean(parsed.favoritesOnly),
    };
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
};

export const saveReminderSettings = async (
  settings: ReminderSettings,
): Promise<void> => {
  try {
    await Preferences.set({
      key: STORAGE_KEY,
      value: JSON.stringify(settings),
    });
  } catch {
    /* ignore storage error */
  }
};

const hashSeed = (seed: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
};

export const formatDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const buildNextTriggerDates = (
  hour: number,
  minute: number,
  days: number,
  now = new Date(),
): Date[] => {
  const first = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
    0,
    0,
  );
  // If today's scheduled time has already passed, start tomorrow.
  if (first.getTime() <= now.getTime() + 15_000) {
    first.setDate(first.getDate() + 1);
  }
  const out: Date[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(first);
    d.setDate(first.getDate() + i);
    out.push(d);
  }
  return out;
};

export type PlannedReminder = {
  id: number;
  at: Date;
  title: string;
  body: string;
  quoteId: string;
};

const clipBody = (text: string, maxLen = 160): string => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1)}…`;
};

export const buildReminderPlan = (
  quotes: Quote[],
  booksById: Map<string, Book>,
  settings: ReminderSettings,
  now = new Date(),
): PlannedReminder[] => {
  const active = quotes.filter((q) => !q.deleted_at && q.content.trim().length > 0);
  if (active.length === 0) return [];

  const favorites = active.filter((q) => q.is_favorite);
  const pool =
    settings.favoritesOnly && favorites.length > 0 ? favorites : active;

  const dates = buildNextTriggerDates(
    settings.hour,
    settings.minute,
    REMINDER_IDS.length,
    now,
  );

  let prevId: string | null = null;
  return dates.map((at, idx) => {
    const key = formatDateKey(at);
    let pickIdx = hashSeed(`reminder:${key}:${pool.length}`) % pool.length;
    if (pool.length > 1 && pool[pickIdx].id === prevId) {
      pickIdx = (pickIdx + 1) % pool.length;
    }
    const q = pool[pickIdx];
    prevId = q.id;
    const book = q.book_id ? booksById.get(q.book_id) : undefined;
    const title = book?.title
      ? book.author
        ? `《${book.title}》 · ${book.author}`
        : `《${book.title}》`
      : "Quote";
    const pageSuffix =
      typeof q.page === "number" && q.page > 0 ? ` (p.${q.page})` : "";

    return {
      id: REMINDER_IDS[idx],
      at,
      title,
      body: `“${clipBody(q.content)}”${pageSuffix}`,
      quoteId: q.id,
    };
  });
};

export const cancelScheduledReminders = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({
      notifications: REMINDER_IDS.concat(TEST_NOTIFICATION_ID).map((id) => ({
        id,
      })),
    });
  } catch {
    /* plugin unavailable */
  }
};

export type RescheduleOutcome =
  | { status: "disabled" }
  | { status: "empty" }
  | { status: "denied" }
  | { status: "scheduled"; count: number; nextAt: Date | null }
  | { status: "web_saved"; count: number; nextAt: Date | null };

export const rescheduleDailyReminders = async (
  overrideSettings?: ReminderSettings,
  requestPermissionIfNeeded = false,
): Promise<RescheduleOutcome> => {
  const settings = overrideSettings ?? (await loadReminderSettings());
  if (!settings.enabled) {
    await cancelScheduledReminders();
    return { status: "disabled" };
  }

  const [quotes, books] = await Promise.all([
    repo.listQuotes(),
    repo.listBooks(),
  ]);
  const booksById = new Map(books.map((b) => [b.id, b]));
  const plan = buildReminderPlan(quotes, booksById, settings);

  if (plan.length === 0) {
    await cancelScheduledReminders();
    return { status: "empty" };
  }

  if (!Capacitor.isNativePlatform()) {
    return {
      status: "web_saved",
      count: plan.length,
      nextAt: plan[0]?.at ?? null,
    };
  }

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted" && requestPermissionIfNeeded) {
      perm = await LocalNotifications.requestPermissions();
    }
    if (perm.display !== "granted") {
      return { status: "denied" };
    }

    await LocalNotifications.cancel({
      notifications: REMINDER_IDS.map((id) => ({ id })),
    });

    await LocalNotifications.schedule({
      notifications: plan.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        schedule: { at: item.at, allowWhileIdle: true },
        extra: { quoteId: item.quoteId },
      })),
    });

    return {
      status: "scheduled",
      count: plan.length,
      nextAt: plan[0]?.at ?? null,
    };
  } catch (e) {
    console.warn("[reminder] schedule failed:", e);
    return { status: "denied" };
  }
};

export const sendPreviewReminder = async (): Promise<
  "sent" | "denied" | "empty"
> => {
  const [quotes, books] = await Promise.all([
    repo.listQuotes(),
    repo.listBooks(),
  ]);
  const booksById = new Map(books.map((b) => [b.id, b]));
  const settings = await loadReminderSettings();
  const plan = buildReminderPlan(quotes, booksById, settings);
  if (plan.length === 0) return "empty";

  const sample = plan[0];
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      let perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted") {
        perm = await LocalNotifications.requestPermissions();
      }
      if (perm.display !== "granted") return "denied";
      await LocalNotifications.schedule({
        notifications: [
          {
            id: TEST_NOTIFICATION_ID,
            title: sample.title,
            body: sample.body,
            schedule: { at: new Date(Date.now() + 2500) },
            extra: { quoteId: sample.quoteId },
          },
        ],
      });
      return "sent";
    } catch {
      return "denied";
    }
  }

  if (typeof window !== "undefined" && "Notification" in window) {
    try {
      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") return "denied";
      new Notification(sample.title, { body: sample.body });
      return "sent";
    } catch {
      return "denied";
    }
  }

  return "denied";
};
