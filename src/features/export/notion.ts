import { Capacitor, CapacitorHttp } from "@capacitor/core";
import type { Book, Quote } from "@/sync/types";
import { defaultArchiveFileName } from "./buildMarkdown";
import type { NotionConnection } from "./notionSettings";

const NOTION_VERSION = "2022-06-28";

export type NotionExportResult =
  | { status: "ok"; pageUrl?: string }
  | { status: "error"; message: string };

type NotionBlock = Record<string, unknown>;

const rich = (text: string) => [
  {
    type: "text",
    text: { content: text.slice(0, 2000) },
  },
];

const paragraph = (text: string): NotionBlock => ({
  object: "block",
  type: "paragraph",
  paragraph: { rich_text: rich(text) },
});

const heading2 = (text: string): NotionBlock => ({
  object: "block",
  type: "heading_2",
  heading_2: { rich_text: rich(text) },
});

const quoteBlock = (text: string): NotionBlock => ({
  object: "block",
  type: "quote",
  quote: { rich_text: rich(text) },
});

const divider = (): NotionBlock => ({
  object: "block",
  type: "divider",
  divider: {},
});

/** Notion accepts at most 100 children per page create. */
const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const buildBlocks = (
  quotes: Quote[],
  booksById: Map<string, Book>,
): NotionBlock[] => {
  const blocks: NotionBlock[] = [
    paragraph(
      `Exported from Quote · ${quotes.length} notes · ${new Date()
        .toISOString()
        .slice(0, 10)}`,
    ),
    divider(),
  ];

  const byBook = new Map<string | null, Quote[]>();
  for (const q of quotes) {
    const key = q.book_id;
    const list = byBook.get(key) ?? [];
    list.push(q);
    byBook.set(key, list);
  }

  const keys = [...byBook.keys()].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    const ta = booksById.get(a)?.title ?? "";
    const tb = booksById.get(b)?.title ?? "";
    return ta.localeCompare(tb, "ko");
  });

  for (const bookId of keys) {
    const book = bookId ? booksById.get(bookId) : null;
    const heading = book
      ? `${book.title}${book.author ? ` · ${book.author}` : ""}`
      : "Unassigned";
    blocks.push(heading2(heading));

    const qs = (byBook.get(bookId) ?? []).slice().sort((a, b) => {
      const pa = a.page ?? Number.POSITIVE_INFINITY;
      const pb = b.page ?? Number.POSITIVE_INFINITY;
      if (pa !== pb) return pa - pb;
      return a.captured_at < b.captured_at ? -1 : 1;
    });

    for (const q of qs) {
      blocks.push(quoteBlock(q.content.trim()));
      const meta: string[] = [];
      if (q.page != null) meta.push(`p.${q.page}`);
      meta.push(q.captured_at.slice(0, 10));
      if (q.thoughts?.trim()) {
        blocks.push(paragraph(q.thoughts.trim()));
      }
      blocks.push(paragraph(meta.join(" · ")));
    }
  }

  return blocks;
};

const notionFetch = async (
  path: string,
  token: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> => {
  const url = `https://api.notion.com/v1${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };

  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.request({
      url,
      method: "POST",
      headers,
      data: body,
    });
    const data =
      typeof res.data === "string"
        ? (JSON.parse(res.data) as Record<string, unknown>)
        : ((res.data as Record<string, unknown>) ?? {});
    return { ok: res.status >= 200 && res.status < 300, status: res.status, data };
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
};

/**
 * Create a Notion page under `parentPageId` with quote blocks.
 * Requires the integration to be invited to that page.
 */
export const exportQuotesToNotion = async (
  conn: NotionConnection,
  quotes: Quote[],
  booksById: Map<string, Book>,
): Promise<NotionExportResult> => {
  if (!conn.token || !conn.parentPageId) {
    return { status: "error", message: "notion_not_configured" };
  }

  const title = defaultArchiveFileName();
  const allBlocks = buildBlocks(quotes, booksById);
  const [first, ...restChunks] = chunk(allBlocks, 100);

  const createBody = {
    parent: { page_id: normalizeUuid(conn.parentPageId) },
    properties: {
      title: {
        title: [{ type: "text", text: { content: title } }],
      },
    },
    children: first ?? [],
  };

  try {
    const created = await notionFetch("/pages", conn.token, createBody);
    if (!created.ok) {
      const msg =
        typeof created.data.message === "string"
          ? created.data.message
          : `notion_http_${created.status}`;
      return { status: "error", message: msg };
    }

    const pageId = String(created.data.id ?? "");
    for (const children of restChunks) {
      if (!pageId || children.length === 0) break;
      const append = await notionFetch(`/blocks/${pageId}/children`, conn.token, {
        children,
      });
      if (!append.ok) {
        console.warn("[export] notion append failed", append.status, append.data);
      }
    }

    const pageUrl =
      typeof created.data.url === "string" ? created.data.url : undefined;
    return { status: "ok", pageUrl };
  } catch (e) {
    console.warn("[export] notion failed:", e);
    return {
      status: "error",
      message: e instanceof Error ? e.message : "notion_export_failed",
    };
  }
};

const normalizeUuid = (raw: string): string => {
  const hex = raw.replace(/-/g, "").trim();
  if (hex.length !== 32) return raw.trim();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
