/**
 * Widget data bridge for iOS WidgetKit / Android App Widgets.
 *
 * Writes a compact JSON snapshot whenever quotes or books change so a native
 * Widget Extension (reading from App Group / shared data) can render today's
 * quote and recent highlights without launching the webview.
 */

import { Capacitor, registerPlugin } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Preferences } from "@capacitor/preferences";
import { repo } from "@/sync/repo";
import type { Book, Quote } from "@/sync/types";

export type WidgetQuoteItem = {
  id: string;
  content: string;
  bookTitle: string | null;
  author: string | null;
  page: number | null;
  isFavorite: boolean;
};

export type WidgetQuoteSnapshot = {
  version: 1;
  updatedAt: string;
  totalQuotes: number;
  totalBooks: number;
  dailyQuote: WidgetQuoteItem | null;
  recentQuotes: WidgetQuoteItem[];
};

const SNAPSHOT_PREF_KEY = "quote.widget.snapshot.v1";
const SNAPSHOT_FILE_PATH = "widget-snapshot.json";

type WidgetBridgeNativePlugin = {
  updateSnapshot(opts: { json: string }): Promise<void>;
};

const WidgetBridgePlugin =
  registerPlugin<WidgetBridgeNativePlugin>("WidgetBridge");

const seededIndex = (seed: string, length: number): number => {
  if (length <= 0) return 0;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % length;
};

const todayKey = (now = new Date()): string => {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const toWidgetItem = (
  q: Quote,
  booksById: Map<string, Book>,
): WidgetQuoteItem => {
  const b = q.book_id ? booksById.get(q.book_id) : undefined;
  return {
    id: q.id,
    content: q.content.trim(),
    bookTitle: b?.title ?? null,
    author: b?.author ?? null,
    page: q.page ?? null,
    isFavorite: q.is_favorite,
  };
};

export const buildWidgetSnapshot = (
  quotes: Quote[],
  books: Book[],
  now = new Date(),
): WidgetQuoteSnapshot => {
  const active = quotes.filter((q) => !q.deleted_at && q.content.trim().length > 0);
  const booksById = new Map(books.map((b) => [b.id, b]));
  const dailyIdx = seededIndex(`daily:${todayKey(now)}:${active.length}`, active.length);
  const daily = active.length > 0 ? toWidgetItem(active[dailyIdx], booksById) : null;

  const bookIdsWithQuotes = new Set(
    active.map((q) => q.book_id).filter((id): id is string => Boolean(id)),
  );

  return {
    version: 1,
    updatedAt: now.toISOString(),
    totalQuotes: active.length,
    totalBooks: bookIdsWithQuotes.size,
    dailyQuote: daily,
    recentQuotes: active.slice(0, 12).map((q) => toWidgetItem(q, booksById)),
  };
};

export const syncWidgetSnapshot = async (): Promise<WidgetQuoteSnapshot | null> => {
  try {
    const [quotes, books] = await Promise.all([
      repo.listQuotes(),
      repo.listBooks(),
    ]);
    const snapshot = buildWidgetSnapshot(quotes, books);
    const json = JSON.stringify(snapshot);

    await Preferences.set({ key: SNAPSHOT_PREF_KEY, value: json });

    if (Capacitor.isNativePlatform()) {
      await Filesystem.writeFile({
        path: SNAPSHOT_FILE_PATH,
        data: json,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      }).catch(() => undefined);

      if (Capacitor.isPluginAvailable("WidgetBridge")) {
        await WidgetBridgePlugin.updateSnapshot({ json }).catch(() => undefined);
      }
    }

    return snapshot;
  } catch (e) {
    console.warn("[widgetBridge] sync failed:", e);
    return null;
  }
};
