/**
 * Lightweight Google Books client.
 *
 * Uses the public /volumes search endpoint (no API key required for low
 * volume). CORS is allowed from any origin including the Capacitor
 * `capacitor://localhost` scheme.
 *
 * Docs: https://developers.google.com/books/docs/v1/using
 */

export type BookCandidate = {
  volumeId: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
  description: string | null;
  isbn: string | null;
  coverUrl: string | null;
  /**
   * Confidence-ish score (higher is better). We rank by: title similarity
   * first, then presence of a cover, then author match.
   */
  score: number;
};

type RawVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
    language?: string;
  };
};

const ENDPOINT = "https://www.googleapis.com/books/v1/volumes";

const normalize = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[\s\u3000]+/g, " ")
    .replace(/["'“”‘’·,.:;!?\-–—()\[\]{}]/g, "")
    .trim();

// Rough Korean title similarity via character bigrams. Returns 0..1.
const similarity = (a: string, b: string): number => {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return x === y ? 1 : 0;
  const toBigrams = (s: string) => {
    const out = new Set<string>();
    for (let i = 0; i < s.length - 1; i += 1) out.add(s.slice(i, i + 2));
    return out;
  };
  const bx = toBigrams(x);
  const by = toBigrams(y);
  let inter = 0;
  bx.forEach((g) => {
    if (by.has(g)) inter += 1;
  });
  return (2 * inter) / (bx.size + by.size);
};

const upgradeCover = (url: string | undefined): string | null => {
  if (!url) return null;
  // Google returns http:// thumbnails — iOS ATS forbids non-https. Upgrade.
  let out = url.replace(/^http:\/\//, "https://");
  // Strip `&edge=curl` which adds an ugly page-curl overlay.
  out = out.replace(/&edge=curl/i, "");
  // Ask for a slightly larger zoom when possible.
  out = out.replace(/([?&])zoom=\d/, "$1zoom=1");
  return out;
};

const pickIsbn = (
  ids: Array<{ type: string; identifier: string }> | undefined,
): string | null => {
  if (!ids) return null;
  const isbn13 = ids.find((i) => i.type === "ISBN_13")?.identifier;
  if (isbn13) return isbn13;
  const isbn10 = ids.find((i) => i.type === "ISBN_10")?.identifier;
  return isbn10 ?? null;
};

const parseVolume = (
  v: RawVolume,
  queryTitle: string,
  queryAuthor: string | null,
): BookCandidate | null => {
  const info = v.volumeInfo;
  if (!info?.title) return null;
  const img = info.imageLinks;
  const coverUrl =
    upgradeCover(img?.extraLarge) ??
    upgradeCover(img?.large) ??
    upgradeCover(img?.medium) ??
    upgradeCover(img?.small) ??
    upgradeCover(img?.thumbnail) ??
    upgradeCover(img?.smallThumbnail) ??
    null;

  const titleScore = similarity(queryTitle, info.title);
  const authorScore = queryAuthor
    ? Math.max(
        0,
        ...(info.authors ?? []).map((a) => similarity(queryAuthor, a)),
      )
    : 0;
  const coverBonus = coverUrl ? 0.15 : 0;
  const score = titleScore * 1.0 + authorScore * 0.5 + coverBonus;

  return {
    volumeId: v.id,
    title: info.title,
    subtitle: info.subtitle ?? null,
    authors: info.authors ?? [],
    publisher: info.publisher ?? null,
    publishedDate: info.publishedDate ?? null,
    description: info.description ?? null,
    isbn: pickIsbn(info.industryIdentifiers),
    coverUrl,
    score,
  };
};

const runQuery = async (
  q: string,
  title: string,
  author: string | null,
  maxResults: number,
  signal?: AbortSignal,
  langRestrict?: string,
): Promise<BookCandidate[]> => {
  const url = new URL(ENDPOINT);
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("printType", "books");
  // Latin-script titles: bias toward English editions (better covers/meta).
  if (langRestrict) url.searchParams.set("langRestrict", langRestrict);

  try {
    const res = await fetch(url.toString(), { signal });
    if (!res.ok) {
      console.warn("[googleBooks] non-200", res.status, "for q=", q);
      return [];
    }
    const json = (await res.json()) as { items?: RawVolume[] };
    const candidates = (json.items ?? [])
      .map((v) => parseVolume(v, title, author))
      .filter((x): x is BookCandidate => !!x);
    candidates.sort((x, y) => y.score - x.score);
    return candidates;
  } catch (e) {
    if ((e as { name?: string }).name === "AbortError") return [];
    console.warn("[googleBooks] fetch failed for q=", q, e);
    return [];
  }
};

/**
 * Search Google Books for candidates matching the given title (+author).
 *
 * Strategy (two passes, first pass that produces candidates wins):
 *   1) Strict field-qualified search: `intitle:"..." inauthor:"..."`.
 *      This gives the most precise results for well-known titles.
 *   2) Free-text fallback: `title author`. Korean publishers' metadata on
 *      Google Books frequently uses slightly different punctuation / subtitle
 *      formatting than what the user types, so the strict query returns 0
 *      items; the free-text query usually still surfaces the book.
 *
 * Results are ranked by title similarity × author similarity × cover bonus.
 * Returns [] on any network failure, abort, or zero hits.
 */
export const searchBooks = async (
  title: string,
  author?: string | null,
  opts: { maxResults?: number; signal?: AbortSignal; langRestrict?: string } = {},
): Promise<BookCandidate[]> => {
  const t = title.trim();
  if (!t) return [];
  const a = author?.trim() || null;
  const maxResults = opts.maxResults ?? 6;
  const lang = opts.langRestrict;

  // Pass 1 — strict intitle/inauthor.
  const strictParts: string[] = [`intitle:"${t.replace(/"/g, "")}"`];
  if (a) strictParts.push(`inauthor:"${a.replace(/"/g, "")}"`);
  let results = await runQuery(strictParts.join("+"), t, a, maxResults, opts.signal, lang);

  // Pass 2 — free-text fallback if strict returned nothing useful.
  if (results.length === 0) {
    const freeText = a ? `${t} ${a}` : t;
    results = await runQuery(freeText, t, a, maxResults, opts.signal, lang);
  }

  return results;
};

/**
 * Convenience — fetch the best cover URL (or null) for a title/author pair.
 *
 * Accepts a match when any of:
 *   - similarity score >= minScore (default 0.25 — low enough for Korean
 *     subtitle drift, high enough to reject unrelated books), or
 *   - the normalized query title is a substring of the candidate's
 *     normalized title (and vice versa). This catches cases like query
 *     "데미안" vs Google's "데미안 (개정판)" where bigram similarity is
 *     deceptively low but the match is obviously correct.
 */
export const fetchBestCover = async (
  title: string,
  author?: string | null,
  opts: { minScore?: number; signal?: AbortSignal } = {},
): Promise<{ coverUrl: string; isbn: string | null } | null> => {
  const minScore = opts.minScore ?? 0.25;
  const candidates = await searchBooks(title, author, {
    maxResults: 6,
    signal: opts.signal,
  });
  if (candidates.length === 0) {
    console.info(`[googleBooks] no candidates for "${title}"`);
    return null;
  }
  const normQuery = normalize(title);
  const isContained = (c: BookCandidate) => {
    const normCand = normalize(c.title);
    if (!normQuery || !normCand) return false;
    return normCand.includes(normQuery) || normQuery.includes(normCand);
  };
  const best = candidates.find(
    (c) => c.coverUrl && (c.score >= minScore || isContained(c)),
  );
  if (!best || !best.coverUrl) {
    const top = candidates[0];
    console.info(
      `[googleBooks] no cover matched threshold for "${title}" (top: "${top?.title}" score=${top?.score.toFixed(2)}, hasCover=${!!top?.coverUrl})`,
    );
    return null;
  }
  console.info(
    `[googleBooks] ✓ "${title}" → "${best.title}" score=${best.score.toFixed(2)}`,
  );
  return { coverUrl: best.coverUrl, isbn: best.isbn };
};
