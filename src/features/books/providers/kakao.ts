/**
 * Kakao Daum book search adapter.
 *
 * Why this is the primary provider for Korean books:
 *   - Kakao's index is sourced from 교보문고 / 예스24 — i.e. the same
 *     metadata Korean publishers already feed to the major Korean
 *     retailers. Cover hit rate and author normalization are noticeably
 *     higher than Google Books for Korean titles.
 *   - Free tier is 10,000 calls/day per REST API key, with no OAuth
 *     handshake — a single header (`Authorization: KakaoAK <key>`).
 *
 * Failure modes:
 *   - No `VITE_KAKAO_REST_KEY` ⇒ `isEnabled()` returns false; the
 *     orchestrator silently skips this adapter, so the app still works
 *     for any solo developer who hasn't issued a key yet (myself
 *     included, today).
 *   - Network / 4xx / 5xx ⇒ adapter resolves to `[]`, never throws,
 *     never blocks the UI.
 */

import type {
  BookCandidate,
  BookSearchOptions,
  BookSearchProvider,
} from "../types";
import { looksContained, scoreCandidate } from "../textSimilarity";

const ENDPOINT = "https://dapi.kakao.com/v3/search/book";

type KakaoBook = {
  title: string;
  contents: string;
  url: string;
  isbn: string;
  datetime: string;
  authors: string[];
  publisher: string;
  translators: string[];
  price: number;
  sale_price: number;
  thumbnail: string;
  status: string;
};

type KakaoResponse = {
  documents?: KakaoBook[];
};

const REST_KEY = (import.meta.env.VITE_KAKAO_REST_KEY as string | undefined) ?? "";

const upgradeCover = (url: string | null | undefined): string | null => {
  if (!url) return null;
  // Kakao thumbnails come over https already, but they encode an
  // `&fname=...` redirect. Returning verbatim is safe.
  return url;
};

const pickIsbn = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  // Kakao returns "10-digit 13-digit" or just one. Prefer ISBN-13.
  const parts = raw.trim().split(/\s+/);
  const thirteen = parts.find((p) => p.length === 13);
  if (thirteen) return thirteen;
  const ten = parts.find((p) => p.length === 10);
  return ten ?? parts[0] ?? null;
};

const parseDoc = (
  d: KakaoBook,
  queryTitle: string,
  queryAuthor: string | null,
): BookCandidate => {
  const coverUrl = upgradeCover(d.thumbnail);
  return {
    externalId: pickIsbn(d.isbn),
    title: d.title,
    subtitle: null,
    authors: d.authors ?? [],
    publisher: d.publisher || null,
    publishedDate: d.datetime || null,
    description: d.contents || null,
    isbn: pickIsbn(d.isbn),
    coverUrl,
    score: scoreCandidate(
      queryTitle,
      queryAuthor,
      d.title,
      d.authors ?? [],
      !!coverUrl,
    ),
    provider: "kakao",
  };
};

const runQuery = async (
  query: string,
  target: "title" | "person" | undefined,
  title: string,
  author: string | null,
  size: number,
  signal?: AbortSignal,
): Promise<BookCandidate[]> => {
  const url = new URL(ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("size", String(size));
  url.searchParams.set("sort", "accuracy");
  if (target) url.searchParams.set("target", target);

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${REST_KEY}` },
      signal,
    });
    if (!res.ok) {
      console.warn("[kakao] non-200", res.status, "for query=", query);
      return [];
    }
    const json = (await res.json()) as KakaoResponse;
    const candidates = (json.documents ?? []).map((d) =>
      parseDoc(d, title, author),
    );
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  } catch (e) {
    if ((e as { name?: string }).name === "AbortError") return [];
    console.warn("[kakao] fetch failed for query=", query, e);
    return [];
  }
};

export const kakaoBooksProvider: BookSearchProvider = {
  id: "kakao",
  label: "Kakao 책 검색",
  isEnabled: () => REST_KEY.length > 0,

  async search(title, author, opts: BookSearchOptions = {}) {
    const t = title.trim();
    if (!t) return [];
    const a = author?.trim() || null;
    const size = Math.min(opts.maxResults ?? 6, 50);

    // Pass 1 — `target=title` returns higher-precision title matches.
    let results = await runQuery(t, "title", t, a, size, opts.signal);

    // Pass 2 — drop the target restriction so subtitle/author hits also
    // surface. Useful when the user typed an abbreviated title.
    if (results.length === 0) {
      const free = a ? `${t} ${a}` : t;
      results = await runQuery(free, undefined, t, a, size, opts.signal);
    }

    // Filter out clearly-unrelated noise so the orchestrator's "best of
    // best" pick is meaningful. Keep candidates that either score over
    // 0.25 *or* look contained — same recipe used in the Google adapter.
    return results.filter(
      (c) => c.score >= 0.25 || looksContained(t, c.title),
    );
  },
};
