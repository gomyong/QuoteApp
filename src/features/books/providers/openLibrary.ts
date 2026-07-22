/**
 * Open Library book search adapter.
 *
 * Why this provider exists:
 *   - Kakao/Naver are Korea-centric and mostly miss English / North
 *     American titles. Google Books covers those but has gaps for indie
 *     and newer US/CA releases, plus low-res thumbnails.
 *   - Open Library (Internet Archive) has a strong English/US catalog,
 *     is completely free, needs no API key, and — crucially — sends
 *     permissive CORS headers, so it works on web *and* native.
 *
 * Role in the chain:
 *   - For Latin-script (English) titles it runs right after Google Books.
 *   - For Korean titles it sits at the very end as a last-resort fallback.
 *
 * Failure modes:
 *   - Network / 4xx / 5xx / abort ⇒ resolves to `[]`, never throws.
 *   - Always enabled (no key required).
 *
 * Docs: https://openlibrary.org/dev/docs/api/search
 *       https://openlibrary.org/dev/docs/api/covers
 */

import type {
  BookCandidate,
  BookSearchOptions,
  BookSearchProvider,
} from "../types";
import { looksContained, scoreCandidate } from "../textSimilarity";

const ENDPOINT = "https://openlibrary.org/search.json";

type OpenLibraryDoc = {
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  isbn?: string[];
  cover_i?: number;
  cover_edition_key?: string;
  publisher?: string[];
};

type OpenLibraryResponse = {
  docs?: OpenLibraryDoc[];
};

/**
 * Prefer the numeric cover id (most reliable). Fall back to an ISBN-based
 * cover URL. `default=false` makes Open Library 404 instead of serving a
 * blank 1×1 placeholder when the cover is actually missing.
 */
const buildCoverUrl = (doc: OpenLibraryDoc): string | null => {
  if (typeof doc.cover_i === "number") {
    return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
  }
  const isbn = doc.isbn?.find((i) => i.length === 13) ?? doc.isbn?.[0];
  if (isbn) {
    return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  }
  return null;
};

const pickIsbn = (isbns: string[] | undefined): string | null => {
  if (!isbns || isbns.length === 0) return null;
  return isbns.find((i) => i.length === 13) ?? isbns[0] ?? null;
};

const parseDoc = (
  d: OpenLibraryDoc,
  queryTitle: string,
  queryAuthor: string | null,
): BookCandidate | null => {
  if (!d.title) return null;
  const coverUrl = buildCoverUrl(d);
  const authors = d.author_name ?? [];
  return {
    externalId: d.cover_edition_key ?? null,
    title: d.title,
    subtitle: null,
    authors,
    publisher: d.publisher?.[0] ?? null,
    publishedDate: d.first_publish_year ? String(d.first_publish_year) : null,
    description: null,
    isbn: pickIsbn(d.isbn),
    coverUrl,
    score: scoreCandidate(queryTitle, queryAuthor, d.title, authors, !!coverUrl),
    provider: "openLibrary",
  };
};

const runQuery = async (
  title: string,
  author: string | null,
  limit: number,
  signal?: AbortSignal,
): Promise<BookCandidate[]> => {
  const url = new URL(ENDPOINT);
  url.searchParams.set("title", title);
  if (author) url.searchParams.set("author", author);
  url.searchParams.set("limit", String(limit));
  // Trim the payload — the search endpoint is otherwise very chatty.
  url.searchParams.set(
    "fields",
    "title,author_name,first_publish_year,isbn,cover_i,cover_edition_key,publisher",
  );

  try {
    const res = await fetch(url.toString(), { signal });
    if (!res.ok) {
      console.warn("[openLibrary] non-200", res.status, "for title=", title);
      return [];
    }
    const json = (await res.json()) as OpenLibraryResponse;
    const candidates = (json.docs ?? [])
      .map((d) => parseDoc(d, title, author))
      .filter((x): x is BookCandidate => !!x);
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  } catch (e) {
    if ((e as { name?: string }).name === "AbortError") return [];
    console.warn("[openLibrary] fetch failed for title=", title, e);
    return [];
  }
};

export const openLibraryProvider: BookSearchProvider = {
  id: "openLibrary",
  label: "Open Library",
  isEnabled: () => true,

  async search(title, author, opts: BookSearchOptions = {}) {
    const t = title.trim();
    if (!t) return [];
    const a = author?.trim() || null;
    const limit = Math.min(opts.maxResults ?? 6, 20);

    // Pass 1 — title + author for precision.
    let results = await runQuery(t, a, limit, opts.signal);

    // Pass 2 — title only, when the author-qualified query came up empty
    // (Open Library author matching is stricter than Kakao/Naver).
    if (results.length === 0 && a) {
      results = await runQuery(t, null, limit, opts.signal);
    }

    return results.filter(
      (c) => c.score >= 0.25 || looksContained(t, c.title),
    );
  },
};
