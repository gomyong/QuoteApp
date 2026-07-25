import type { Book, Quote } from "@/sync/types";

export type ArchiveQuote = Quote & {
  book?: Book | null;
};

const escapeMd = (s: string): string =>
  s.replace(/([\\`*_[\]{}])/g, "\\$1");

const formatDate = (iso: string): string => {
  try {
    return iso.slice(0, 10);
  } catch {
    return iso;
  }
};

/** Build a vault-friendly Markdown archive from quotes (+ optional books). */
export const buildQuotesMarkdown = (
  quotes: Quote[],
  booksById: Map<string, Book>,
): string => {
  const lines: string[] = [
    "# Quote archive",
    "",
    `_Exported ${formatDate(new Date().toISOString())} · ${quotes.length} notes_`,
    "",
  ];

  const byBook = new Map<string, Quote[]>();
  const unassigned: Quote[] = [];

  for (const q of quotes) {
    if (!q.book_id) {
      unassigned.push(q);
      continue;
    }
    const list = byBook.get(q.book_id) ?? [];
    list.push(q);
    byBook.set(q.book_id, list);
  }

  const bookIds = [...byBook.keys()].sort((a, b) => {
    const ta = booksById.get(a)?.title ?? "";
    const tb = booksById.get(b)?.title ?? "";
    return ta.localeCompare(tb, "ko");
  });

  for (const bookId of bookIds) {
    const book = booksById.get(bookId);
    const title = book?.title?.trim() || "Untitled";
    const author = book?.author?.trim();
    lines.push(`## ${escapeMd(title)}`);
    if (author) lines.push(`*${escapeMd(author)}*`, "");
    else lines.push("");

    const qs = (byBook.get(bookId) ?? []).slice().sort((a, b) => {
      const pa = a.page ?? Number.POSITIVE_INFINITY;
      const pb = b.page ?? Number.POSITIVE_INFINITY;
      if (pa !== pb) return pa - pb;
      return a.captured_at < b.captured_at ? -1 : 1;
    });

    for (const q of qs) {
      appendQuoteBlock(lines, q);
    }
  }

  if (unassigned.length > 0) {
    lines.push("## Unassigned", "");
    for (const q of unassigned) appendQuoteBlock(lines, q);
  }

  return lines.join("\n").trimEnd() + "\n";
};

const appendQuoteBlock = (lines: string[], q: Quote) => {
  const meta: string[] = [];
  if (q.page != null) meta.push(`p.${q.page}`);
  meta.push(formatDate(q.captured_at));
  if (q.is_favorite) meta.push("★");

  lines.push(`> ${q.content.trim().replace(/\n/g, "\n> ")}`);
  lines.push("");
  if (q.thoughts?.trim()) {
    lines.push(q.thoughts.trim());
    lines.push("");
  }
  lines.push(`— ${meta.join(" · ")}`);
  lines.push("");
};

export const defaultArchiveFileName = (): string => {
  const d = new Date().toISOString().slice(0, 10);
  return `quote-archive-${d}`;
};
