/**
 * Book search orchestrator.
 *
 * Chains the configured providers in priority order and returns the
 * first non-empty result set. The order is:
 *
 *     Kakao  →  Naver  →  Google Books
 *
 * Why this order:
 *   - Kakao's index is fed by 교보문고/예스24, which means the closest
 *     match for *Korean* titles. Hit rate and cover quality are best
 *     here for the typical Quote user.
 *   - Naver has the largest free quota of the three (25k/day) and a
 *     wider catalog including older Korean editions, but its scoring is
 *     looser, so we fall through to it only when Kakao misses.
 *   - Google Books is the universal fallback — strong on English titles
 *     and obscure imports, mediocre on Korean metadata.
 *
 * Adapter-level safety:
 *   - Each adapter returns `[]` on any failure (network, 4xx, 5xx,
 *     CORS, AbortError) — never throws — so the chain is resilient
 *     out of the box.
 *   - `isEnabled()` lets adapters opt out when their config is missing.
 *     The whole feature still works on a barebones `.env` that only
 *     defines Supabase keys (i.e. the *current* solo-developer setup):
 *     Kakao and Naver report disabled, Google handles everything, and
 *     behavior is identical to the pre-refactor build.
 *
 * Concurrency:
 *   - Sequential, not parallel. We *want* to short-circuit on the first
 *     decent result so we don't burn quota on every provider for a
 *     query that Kakao already nailed.
 */

import type {
  BookCandidate,
  BookSearchOptions,
  BookSearchProvider,
} from "./types";
import { looksContained } from "./textSimilarity";
import { kakaoBooksProvider } from "./providers/kakao";
import { naverBooksProvider } from "./providers/naver";
import { googleBooksProvider } from "./providers/google";
import {
  getCachedCoverLookup,
  setCachedCoverLookup,
} from "./bookSearchCache";

const PROVIDERS: BookSearchProvider[] = [
  kakaoBooksProvider,
  naverBooksProvider,
  googleBooksProvider,
];

/**
 * Search every enabled provider in priority order and stop at the first
 * provider that produced *any* candidates. Returns an array sorted by
 * score (desc) — already done by individual adapters, but we re-sort
 * for safety since some adapters may interleave passes.
 */
export const searchBooksMulti = async (
  title: string,
  author: string | null,
  opts: BookSearchOptions = {},
): Promise<{
  candidates: BookCandidate[];
  triedProviders: string[];
  hitProvider: string | null;
}> => {
  const t = title.trim();
  if (!t)
    return { candidates: [], triedProviders: [], hitProvider: null };

  const tried: string[] = [];
  for (const p of PROVIDERS) {
    if (!p.isEnabled()) continue;
    tried.push(p.id);
    const res = await p.search(t, author, opts);
    if (res.length > 0) {
      const sorted = [...res].sort((a, b) => b.score - a.score);
      return {
        candidates: sorted,
        triedProviders: tried,
        hitProvider: p.id,
      };
    }
  }
  return { candidates: [], triedProviders: tried, hitProvider: null };
};

/**
 * Convenience — pick the best confidently-matching candidate's cover.
 * Mirrors the legacy `fetchBestCover()` API in `googleBooks.ts`, so
 * callers in `useEnsureCovers.ts` migrate by changing only the import
 * source.
 *
 * Acceptance criterion is unchanged from the legacy helper:
 *   - score >= minScore (default 0.25), OR
 *   - candidate title looks contained vs query title.
 *
 * Both rules are necessary because pure bigram score under-rates
 * "데미안" vs "데미안 (개정판)" type pairs.
 */
export const fetchBestCoverMulti = async (
  title: string,
  author?: string | null,
  opts: {
    minScore?: number;
    signal?: AbortSignal;
    /**
     * When true, ignore the IndexedDB cache and force a live lookup.
     * Used by the Settings "표지 자동 찾기" diagnostic so the user can
     * retry from a clean slate without waiting for the TTL.
     */
    bypassCache?: boolean;
  } = {},
): Promise<{
  coverUrl: string;
  isbn: string | null;
  provider: string;
} | null> => {
  const minScore = opts.minScore ?? 0.25;
  const normalizedAuthor = author?.trim() || null;

  // 1) Cache check — both positive and negative hits short-circuit the
  //    upstream chain, saving every single quota call we possibly can.
  if (!opts.bypassCache) {
    const cached = await getCachedCoverLookup(title, normalizedAuthor);
    if (cached !== undefined) {
      // Positive hit: return as-is. Negative hit: still return null,
      // matching the live-call contract.
      return cached;
    }
  }

  const { candidates, hitProvider } = await searchBooksMulti(
    title,
    normalizedAuthor,
    { maxResults: 6, signal: opts.signal },
  );

  if (candidates.length === 0) {
    console.info(`[bookSearch] no candidates for "${title}"`);
    // Negative cache: prevents quota burn on the same miss every render.
    await setCachedCoverLookup(title, normalizedAuthor, null);
    return null;
  }

  const best = candidates.find(
    (c) =>
      c.coverUrl &&
      (c.score >= minScore || looksContained(title, c.title)),
  );
  if (!best || !best.coverUrl) {
    const top = candidates[0];
    console.info(
      `[bookSearch] no cover matched threshold for "${title}" (top: "${top?.title}" score=${top?.score.toFixed(2)}, hasCover=${!!top?.coverUrl}, provider=${top?.provider})`,
    );
    await setCachedCoverLookup(title, normalizedAuthor, null);
    return null;
  }

  console.info(
    `[bookSearch] ✓ "${title}" → "${best.title}" via ${hitProvider} score=${best.score.toFixed(2)}`,
  );
  const result = {
    coverUrl: best.coverUrl,
    isbn: best.isbn,
    provider: best.provider,
  };
  await setCachedCoverLookup(title, normalizedAuthor, result);
  return result;
};

/**
 * Diagnostic helper — exposes which providers are currently active.
 * Useful for the Settings cover-retry panel so users can see "Kakao
 * 활성, Naver 비활성, Google 활성" instead of the silent fallback we'd
 * otherwise have when keys are missing.
 */
export const enabledProviders = (): {
  id: string;
  label: string;
  enabled: boolean;
}[] =>
  PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    enabled: p.isEnabled(),
  }));
