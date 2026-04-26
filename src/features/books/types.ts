/**
 * Provider-agnostic book search types.
 *
 * The app speaks a single canonical shape (BookCandidate) regardless of
 * which upstream returned the data — Google Books, Kakao, Naver, etc.
 * Each provider lives in its own file and exposes a `BookSearchProvider`
 * implementation that maps its native response into this shape.
 */

export type BookCandidate = {
  /**
   * Stable per-provider id when available (e.g. Google Books volumeId).
   * Used only for debug logging and dedupe across passes from the same
   * provider — never persisted, never compared across providers.
   */
  externalId: string | null;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
  description: string | null;
  isbn: string | null;
  coverUrl: string | null;
  /**
   * Internal score (higher = better). Computed *inside* the provider
   * adapter (using a shared similarity helper) so cross-provider results
   * remain comparable without each call site re-implementing ranking.
   */
  score: number;
  /** Which adapter produced this candidate. Useful for diagnostic UI. */
  provider: BookProviderId;
};

export type BookProviderId = "kakao" | "naver" | "google";

export type BookSearchOptions = {
  maxResults?: number;
  signal?: AbortSignal;
};

export type BookSearchProvider = {
  id: BookProviderId;
  /** Human-readable name, e.g. for diagnostic surfaces. */
  label: string;
  /**
   * True when the adapter has the runtime config it needs (API keys, etc.).
   * The orchestrator (`bookSearchService`) skips disabled providers, so the
   * app silently degrades when keys are missing instead of throwing.
   */
  isEnabled(): boolean;
  search(
    title: string,
    author: string | null,
    options: BookSearchOptions,
  ): Promise<BookCandidate[]>;
};
