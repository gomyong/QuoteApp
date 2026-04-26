/**
 * Naver book search adapter.
 *
 * Used as the second-line provider for Korean titles when Kakao misses.
 * Naver's free tier is the most generous among the three (25,000
 * calls/day per app), but it requires *both* a Client ID and a Client
 * Secret in the request headers. Like Kakao, missing config disables
 * the adapter rather than throwing.
 *
 * NOTE — CORS:
 *   Naver's search API does **not** send permissive CORS headers, so
 *   browser callers normally need a server proxy. Capacitor (iOS WKWebView
 *   and Android) is exempt — native fetches don't enforce CORS — so the
 *   adapter works as-is on device. For the dev web build the call falls
 *   through silently when the browser blocks it (the orchestrator just
 *   moves on to the next provider).
 */

import type {
  BookCandidate,
  BookSearchOptions,
  BookSearchProvider,
} from "../types";
import { Capacitor } from "@capacitor/core";
import { looksContained, scoreCandidate } from "../textSimilarity";

const ENDPOINT = "https://openapi.naver.com/v1/search/book.json";

type NaverItem = {
  title: string;
  link: string;
  image: string;
  author: string;
  discount: string;
  publisher: string;
  pubdate: string;
  isbn: string;
  description: string;
};

type NaverResponse = {
  items?: NaverItem[];
};

const CLIENT_ID =
  (import.meta.env.VITE_NAVER_CLIENT_ID as string | undefined) ?? "";
const CLIENT_SECRET =
  (import.meta.env.VITE_NAVER_CLIENT_SECRET as string | undefined) ?? "";

const stripHtml = (s: string): string =>
  s.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, " ");

const splitAuthors = (raw: string): string[] => {
  // Naver joins authors with " | " (a literal pipe with spaces).
  if (!raw) return [];
  return raw
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);
};

const pickIsbn = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const parts = raw.trim().split(/\s+/);
  const thirteen = parts.find((p) => p.length === 13);
  if (thirteen) return thirteen;
  const ten = parts.find((p) => p.length === 10);
  return ten ?? parts[0] ?? null;
};

const parseItem = (
  it: NaverItem,
  queryTitle: string,
  queryAuthor: string | null,
): BookCandidate => {
  const title = stripHtml(it.title);
  const authors = splitAuthors(it.author);
  const coverUrl = it.image || null;
  return {
    externalId: pickIsbn(it.isbn),
    title,
    subtitle: null,
    authors,
    publisher: it.publisher || null,
    publishedDate: it.pubdate || null,
    description: it.description ? stripHtml(it.description) : null,
    isbn: pickIsbn(it.isbn),
    coverUrl,
    score: scoreCandidate(queryTitle, queryAuthor, title, authors, !!coverUrl),
    provider: "naver",
  };
};

const runQuery = async (
  query: string,
  title: string,
  author: string | null,
  display: number,
  signal?: AbortSignal,
): Promise<BookCandidate[]> => {
  const url = new URL(ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(display));
  url.searchParams.set("sort", "sim"); // similarity

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "X-Naver-Client-Id": CLIENT_ID,
        "X-Naver-Client-Secret": CLIENT_SECRET,
      },
      signal,
    });
    if (!res.ok) {
      console.warn("[naver] non-200", res.status, "for query=", query);
      return [];
    }
    const json = (await res.json()) as NaverResponse;
    const candidates = (json.items ?? []).map((it) =>
      parseItem(it, title, author),
    );
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  } catch (e) {
    if ((e as { name?: string }).name === "AbortError") return [];
    console.warn("[naver] fetch failed for query=", query, e);
    return [];
  }
};

export const naverBooksProvider: BookSearchProvider = {
  id: "naver",
  label: "Naver 책 검색",
  isEnabled: () => CLIENT_ID.length > 0 && CLIENT_SECRET.length > 0,

  async search(title, author, opts: BookSearchOptions = {}) {
    const t = title.trim();
    if (!t) return [];
    const a = author?.trim() || null;
    const display = Math.min(opts.maxResults ?? 6, 100);

    // Naver doesn't have separate title/author search modes (just a
    // free-text query), so one pass is enough. We do a strict first
    // (title + author) and fall back to title-only when the strict
    // query returned nothing — Naver matches the "OR-y" combined query
    // very loosely, but the title-only fallback usually still works.
    const strict = a ? `${t} ${a}` : t;
    let results = await runQuery(strict, t, a, display, opts.signal);
    if (results.length === 0 && a) {
      results = await runQuery(t, t, a, display, opts.signal);
    }

    return results.filter(
      (c) => c.score >= 0.25 || looksContained(t, c.title),
    );
  },
};

/**
 * Marker so the orchestrator can warn during dev when the Naver adapter
 * is configured but running in a context (browser dev server) where CORS
 * will block its requests. Native (iOS/Android) and prod proxies are OK.
 */
export const naverNeedsNativeOrProxy = (): boolean =>
  !Capacitor.isNativePlatform();
