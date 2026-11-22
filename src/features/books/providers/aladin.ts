/**
 * Aladin TTB Open API book search adapter.
 *
 * Replaces Naver Book Search (retired July 2026) as a high-coverage Korean
 * catalog source. Aladin returns high-resolution covers (`Cover=Big`),
 * normalized `isbn13`, publisher, and publication dates.
 *
 * Setup:
 *   - Issue a free TTBKey at https://www.aladin.co.kr/ttb/wmain.aspx
 *   - Set `VITE_ALADIN_TTB_KEY=...` in `.env.local`
 *
 * Failure modes:
 *   - Missing key -> `isEnabled()` returns false (silently skipped).
 *   - Browser CORS / network / 4xx / 5xx -> resolves to `[]`, never throws.
 *     (Native Capacitor builds bypass browser CORS.)
 */

import type {
  BookCandidate,
  BookSearchOptions,
  BookSearchProvider,
} from "../types";
import { looksContained, scoreCandidate } from "../textSimilarity";

const ENDPOINT = "https://www.aladin.co.kr/ttb/api/ItemSearch.aspx";

type AladinItem = {
  title?: string;
  author?: string;
  pubDate?: string;
  description?: string;
  isbn?: string;
  isbn13?: string;
  cover?: string;
  publisher?: string;
  itemId?: number;
};

type AladinResponse = {
  item?: AladinItem[];
};

const TTB_KEY = (import.meta.env.VITE_ALADIN_TTB_KEY as string | undefined) ?? "";

const normalizeCover = (url: string | undefined): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^http:\/\//i, "https://");
};

const splitAuthors = (raw: string | undefined): string[] => {
  if (!raw) return [];
  // Aladin formats authors like "이탈로 칼비노 (지은이), 이현경 (옮긴이)"
  return raw
    .split(",")
    .map((part) => part.replace(/\s*\([^)]*\)\s*/g, "").trim())
    .filter(Boolean);
};

export const parseAladinItem = (
  item: AladinItem,
  queryTitle: string,
  queryAuthor: string | null,
): BookCandidate => {
  const title = (item.title ?? "").trim();
  const authors = splitAuthors(item.author);
  const coverUrl = normalizeCover(item.cover);
  const isbn = (item.isbn13 || item.isbn || "").trim() || null;
  return {
    externalId: item.itemId ? String(item.itemId) : isbn,
    title,
    subtitle: null,
    authors,
    publisher: item.publisher?.trim() || null,
    publishedDate: item.pubDate?.trim() || null,
    description: item.description?.trim() || null,
    isbn,
    coverUrl,
    score: scoreCandidate(queryTitle, queryAuthor, title, authors, !!coverUrl),
    provider: "aladin",
  };
};

const runQuery = async (
  query: string,
  queryType: "Title" | "Keyword",
  title: string,
  author: string | null,
  maxResults: number,
  signal?: AbortSignal,
): Promise<BookCandidate[]> => {
  const url = new URL(ENDPOINT);
  url.searchParams.set("ttbkey", TTB_KEY);
  url.searchParams.set("Query", query);
  url.searchParams.set("QueryType", queryType);
  url.searchParams.set("MaxResults", String(maxResults));
  url.searchParams.set("start", "1");
  url.searchParams.set("SearchTarget", "Book");
  url.searchParams.set("output", "js");
  url.searchParams.set("Version", "20131101");
  url.searchParams.set("Cover", "Big");

  try {
    const res = await fetch(url.toString(), { signal });
    if (!res.ok) {
      console.warn("[aladin] non-200", res.status, "for query=", query);
      return [];
    }
    const json = (await res.json()) as AladinResponse;
    const candidates = (json.item ?? [])
      .filter((d) => !!d.title)
      .map((d) => parseAladinItem(d, title, author));
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  } catch (e) {
    if ((e as { name?: string }).name === "AbortError") return [];
    console.warn("[aladin] fetch failed for query=", query, e);
    return [];
  }
};

export const aladinBooksProvider: BookSearchProvider = {
  id: "aladin",
  label: "알라딘 도서",
  isEnabled: () => TTB_KEY.trim().length > 0,

  async search(title, author, opts: BookSearchOptions = {}) {
    const t = title.trim();
    if (!t) return [];
    const a = author?.trim() || null;
    const size = Math.min(opts.maxResults ?? 6, 20);

    let results = await runQuery(t, "Title", t, a, size, opts.signal);
    if (results.length === 0) {
      const free = a ? `${t} ${a}` : t;
      results = await runQuery(free, "Keyword", t, a, size, opts.signal);
    }

    return results.filter(
      (c) => c.score >= 0.25 || looksContained(t, c.title),
    );
  },
};
