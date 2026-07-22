/**
 * Google Books adapter — thin wrapper around the existing
 * `searchBooks()` helper in `googleBooks.ts`.
 *
 * Google Books works without an API key for low volume, so the adapter
 * is *always* enabled. It serves as the universal fallback when the
 * Korean providers (Kakao, Naver) miss — typically for English books
 * or obscure imports.
 *
 * Keeping the wrapper paper-thin (rather than rewriting the existing
 * file) lets us pull in any future improvement to `searchBooks()` for
 * free, without re-touching this adapter.
 */

import type {
  BookCandidate,
  BookSearchOptions,
  BookSearchProvider,
} from "../types";
import { scoreCandidate } from "../textSimilarity";
import { searchBooks as searchGoogleBooks } from "../googleBooks";

export const googleBooksProvider: BookSearchProvider = {
  id: "google",
  label: "Google Books",
  isEnabled: () => true,

  async search(title, author, opts: BookSearchOptions = {}) {
    const candidates = await searchGoogleBooks(title, author, {
      maxResults: opts.maxResults ?? 6,
      signal: opts.signal,
      langRestrict: opts.langRestrict,
    });
    // The legacy helper already produced its own score field; we re-map
    // to the canonical `BookCandidate` shape so the orchestrator can
    // mix Google results with Kakao/Naver on equal footing.
    return candidates.map<BookCandidate>((c) => ({
      externalId: c.volumeId,
      title: c.title,
      subtitle: c.subtitle ?? null,
      authors: c.authors,
      publisher: c.publisher,
      publishedDate: c.publishedDate,
      description: c.description,
      isbn: c.isbn,
      coverUrl: c.coverUrl,
      score: scoreCandidate(
        title,
        author?.trim() || null,
        c.title,
        c.authors,
        !!c.coverUrl,
      ),
      provider: "google",
    }));
  },
};
