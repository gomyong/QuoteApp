import { getDB } from "./db";
import type { Book, LocalImage, OutboxEntry, Quote, Settings } from "./types";

const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const nowIso = () => new Date().toISOString();

export type SaveQuoteInput = {
  content: string;
  thoughts?: string | null;
  page?: number | null;
  is_favorite?: boolean;
  book?: { title: string; author?: string | null; isbn?: string | null } | null;
  image?: { base64: string; mime: string } | null;
};

const enqueue = async (entry: Omit<OutboxEntry, "id" | "created_at" | "attempts">) => {
  const db = await getDB();
  await db.put("outbox", {
    id: uuid(),
    created_at: nowIso(),
    attempts: 0,
    ...entry,
  });
};

/**
 * Normalized book title for dedupe comparisons.
 *
 * Collapses whitespace, strips decorative quotes / punctuation / the word
 * "(개정판)" etc., and lowercases. Two titles that normalize to the same
 * string are treated as the same book.
 */
const normalizeTitle = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[\u3000]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/["'“”‘’·,.:;!?\-–—()\[\]{}]/g, "")
    .trim();

const normalizeAuthor = (author: string | null | undefined): string | null => {
  const t = (author ?? "").trim();
  return t ? t : null;
};

/**
 * Find-or-create the book row for the given title/author.
 *
 * Dedup rules:
 *  - Title normalization (see normalizeTitle) handles case/whitespace/
 *    punctuation drift so "데미안", " 데미안 ", "데미안." all collapse.
 *  - If the existing record has the same normalized title AND either
 *    (a) both authors are empty, (b) one side is empty, or (c) authors
 *    match after trim — we reuse it. When one side has the author and
 *    the other doesn't, we *merge* (fill in the missing author so the
 *    record is more complete).
 *  - If both sides have an author and they differ, we treat it as a
 *    genuinely different book (different edition / translator / same
 *    title different work) and create a new row.
 *
 * The user_id guard used to split records across anon/logged-in states;
 * we've removed it. If a book already exists under the null-owner and
 * the user later signs in, assignOwnerToLocalRecords() will backfill
 * user_id on that same row — we don't want another duplicate in the
 * meantime.
 */
const upsertBookByTitle = async (
  title: string,
  author: string | null,
  userId: string | null,
): Promise<Book> => {
  const db = await getDB();
  const all = await db.getAll("books");
  const normTitle = normalizeTitle(title);
  const normAuthor = normalizeAuthor(author);

  const candidates = all.filter((b) => normalizeTitle(b.title) === normTitle);
  let found: Book | undefined;
  if (candidates.length > 0) {
    if (!normAuthor) {
      // No incoming author — reuse any same-title record.
      found = candidates[0];
    } else {
      // Prefer exact author match, else a same-title record with no author
      // yet (we'll fill it in), else leave as undefined (different edition).
      found =
        candidates.find((b) => normalizeAuthor(b.author) === normAuthor) ??
        candidates.find((b) => !normalizeAuthor(b.author));
    }
  }

  if (found) {
    // Opportunistic merge — fill in author if we now have one, or backfill
    // user_id if the book was saved anonymously and we now know the owner.
    let changed = false;
    const merged: Book = { ...found };
    if (!normalizeAuthor(merged.author) && normAuthor) {
      merged.author = normAuthor;
      changed = true;
    }
    if (merged.user_id === null && userId) {
      merged.user_id = userId;
      changed = true;
    }
    if (changed) {
      merged.updated_at = nowIso();
      await db.put("books", merged);
      await enqueue({ op: { type: "upsert_book", bookId: merged.id } });
      return merged;
    }
    return found;
  }

  const book: Book = {
    id: uuid(),
    user_id: userId,
    title: title.trim(),
    author: normAuthor,
    isbn: null,
    cover_url: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  await db.put("books", book);
  await enqueue({ op: { type: "upsert_book", bookId: book.id } });
  return book;
};

export const repo = {
  async getSettings(): Promise<Settings> {
    const db = await getDB();
    const row = await db.get("settings", "storeImages");
    const storeImages = typeof row?.value === "boolean" ? row.value : false;
    return { storeImages };
  },

  async setStoreImages(value: boolean) {
    const db = await getDB();
    await db.put("settings", { key: "storeImages", value });
  },

  async getMeta(key: "lastPulledAt" | "deviceId"): Promise<string | null> {
    const db = await getDB();
    const row = await db.get("meta", key);
    return row?.value ?? null;
  },

  async setMeta(key: "lastPulledAt" | "deviceId", value: string) {
    const db = await getDB();
    await db.put("meta", { key, value });
  },

  async listQuotes(): Promise<Quote[]> {
    const db = await getDB();
    const all = await db.getAll("quotes");
    return all
      .filter((q) => !q.deleted_at)
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  },

  async getQuote(id: string): Promise<Quote | undefined> {
    const db = await getDB();
    return db.get("quotes", id);
  },

  async listBooks(): Promise<Book[]> {
    const db = await getDB();
    return db.getAll("books");
  },

  async getBook(id: string): Promise<Book | undefined> {
    const db = await getDB();
    return db.get("books", id);
  },

  /**
   * Update a book's cover (and optionally ISBN) and enqueue an outbox
   * upsert so Supabase picks it up on the next sync.
   */
  async updateBookCover(
    id: string,
    coverUrl: string | null,
    isbn?: string | null,
  ): Promise<Book | null> {
    const db = await getDB();
    const b = await db.get("books", id);
    if (!b) return null;
    const updated: Book = {
      ...b,
      cover_url: coverUrl,
      isbn: isbn !== undefined ? (isbn ?? null) : b.isbn,
      updated_at: nowIso(),
    };
    await db.put("books", updated);
    await enqueue({ op: { type: "upsert_book", bookId: id } });
    return updated;
  },

  /**
   * Books that have at least one non-deleted quote attached, annotated
   * with `quoteCount` and `lastQuoteAt` so the library can sort shelves
   * by most-recently-read. Books with zero live quotes are omitted so
   * users aren't haunted by empty shelves after deleting everything.
   */
  async listBooksWithCounts(): Promise<
    Array<Book & { quoteCount: number; lastQuoteAt: string }>
  > {
    const db = await getDB();
    const [books, quotes] = await Promise.all([
      db.getAll("books"),
      db.getAll("quotes"),
    ]);
    const stats = new Map<string, { count: number; lastAt: string }>();
    for (const q of quotes) {
      if (q.deleted_at) continue;
      if (!q.book_id) continue;
      const cur = stats.get(q.book_id);
      const at = q.updated_at ?? q.created_at;
      if (!cur) stats.set(q.book_id, { count: 1, lastAt: at });
      else {
        cur.count += 1;
        if (at > cur.lastAt) cur.lastAt = at;
      }
    }
    const result: Array<Book & { quoteCount: number; lastQuoteAt: string }> = [];
    for (const b of books) {
      const s = stats.get(b.id);
      if (!s) continue;
      result.push({ ...b, quoteCount: s.count, lastQuoteAt: s.lastAt });
    }
    result.sort((a, b) => (a.lastQuoteAt < b.lastQuoteAt ? 1 : -1));
    return result;
  },

  /** Quotes with no book_id (user saved a sentence without book info). */
  async countUnassignedQuotes(): Promise<{ count: number; lastAt: string | null }> {
    const db = await getDB();
    const quotes = await db.getAll("quotes");
    let count = 0;
    let lastAt: string | null = null;
    for (const q of quotes) {
      if (q.deleted_at) continue;
      if (q.book_id) continue;
      count += 1;
      const at = q.updated_at ?? q.created_at;
      if (!lastAt || at > lastAt) lastAt = at;
    }
    return { count, lastAt };
  },

  async listQuotesByBook(bookId: string | null): Promise<Quote[]> {
    const db = await getDB();
    const all = await db.getAll("quotes");
    return all
      .filter((q) => !q.deleted_at && (q.book_id ?? null) === bookId)
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  },

  async saveQuote(input: SaveQuoteInput, currentUserId: string | null): Promise<Quote> {
    const db = await getDB();
    const settings = await this.getSettings();

    let book_id: string | null = null;
    if (input.book?.title?.trim()) {
      const book = await upsertBookByTitle(
        input.book.title,
        input.book.author ?? null,
        currentUserId,
      );
      book_id = book.id;
    }

    const id = uuid();
    const quote: Quote = {
      id,
      user_id: currentUserId,
      book_id,
      content: input.content.trim(),
      thoughts: input.thoughts?.trim() || null,
      page: input.page ?? null,
      source_image_path: null,
      is_favorite: !!input.is_favorite,
      captured_at: nowIso(),
      created_at: nowIso(),
      updated_at: nowIso(),
      deleted_at: null,
    };
    await db.put("quotes", quote);
    await enqueue({ op: { type: "upsert_quote", quoteId: id } });

    if (input.image?.base64 && settings.storeImages) {
      const imgId = uuid();
      const localImage: LocalImage = {
        id: imgId,
        quote_id: id,
        base64: input.image.base64,
        mime: input.image.mime,
        created_at: nowIso(),
      };
      await db.put("images", localImage);
      await enqueue({ op: { type: "upload_image", imageId: imgId } });
    }

    return quote;
  },

  /**
   * Update an existing quote. Fields in `patch` overwrite the stored values;
   * passing `book` attaches/replaces the book link (creating the book if
   * needed), or sets it to null when explicitly `null`. Everything goes
   * through the outbox so it syncs to Supabase on the next connection.
   */
  async updateQuote(
    id: string,
    patch: {
      content?: string;
      thoughts?: string | null;
      page?: number | null;
      is_favorite?: boolean;
      book?: { title: string; author?: string | null } | null;
    },
    currentUserId: string | null,
  ): Promise<Quote | null> {
    const db = await getDB();
    const q = await db.get("quotes", id);
    if (!q) return null;

    let book_id: string | null | undefined = undefined;
    if (patch.book === null) {
      book_id = null;
    } else if (patch.book && patch.book.title.trim()) {
      const book = await upsertBookByTitle(
        patch.book.title,
        patch.book.author ?? null,
        currentUserId,
      );
      book_id = book.id;
    }

    const updated: Quote = {
      ...q,
      content: patch.content !== undefined ? patch.content.trim() : q.content,
      thoughts:
        patch.thoughts === undefined
          ? q.thoughts
          : patch.thoughts === null
            ? null
            : patch.thoughts.trim() || null,
      page: patch.page !== undefined ? patch.page : q.page,
      is_favorite: patch.is_favorite !== undefined ? patch.is_favorite : q.is_favorite,
      book_id: book_id !== undefined ? book_id : q.book_id,
      updated_at: nowIso(),
    };
    await db.put("quotes", updated);
    await enqueue({ op: { type: "upsert_quote", quoteId: id } });
    return updated;
  },

  async toggleFavorite(id: string) {
    const db = await getDB();
    const q = await db.get("quotes", id);
    if (!q) return;
    const updated: Quote = {
      ...q,
      is_favorite: !q.is_favorite,
      updated_at: nowIso(),
    };
    await db.put("quotes", updated);
    await enqueue({ op: { type: "upsert_quote", quoteId: id } });
  },

  async softDeleteQuote(id: string) {
    const db = await getDB();
    const q = await db.get("quotes", id);
    if (!q) return;
    const updated: Quote = { ...q, deleted_at: nowIso(), updated_at: nowIso() };
    await db.put("quotes", updated);
    await enqueue({ op: { type: "delete_quote", quoteId: id } });
  },

  async outboxSize(): Promise<number> {
    const db = await getDB();
    return db.count("outbox");
  },

  async listOutbox(): Promise<OutboxEntry[]> {
    const db = await getDB();
    const all = await db.getAll("outbox");
    return all.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  },

  async deleteOutbox(id: string) {
    const db = await getDB();
    await db.delete("outbox", id);
  },

  async putOutboxEntry(entry: OutboxEntry) {
    const db = await getDB();
    await db.put("outbox", entry);
  },

  async putQuote(q: Quote) {
    const db = await getDB();
    await db.put("quotes", q);
  },

  async putBook(b: Book) {
    const db = await getDB();
    await db.put("books", b);
  },

  async getImage(id: string): Promise<LocalImage | undefined> {
    const db = await getDB();
    return db.get("images", id);
  },

  async deleteImage(id: string) {
    const db = await getDB();
    await db.delete("images", id);
  },

  /**
   * One-shot local cleanup: merge book records that collapse to the same
   * normalized title (see normalizeTitle) into a single "winner" row, and
   * re-point any attached quotes at the winner. The winner is chosen as
   * the book with the most complete metadata (cover > author > oldest
   * created_at as tiebreaker).
   *
   * Quotes that were split across 3 duplicate "데미안" records will all
   * end up under the same book_id after this runs.
   *
   * Safe to call multiple times — a pass with nothing to merge is a noop.
   * Returns the number of duplicate book rows removed locally.
   *
   * NOTE: the losing books stay on Supabase until a future cleanup pass
   *       (no `delete_book` op in the outbox yet). They'll just be
   *       orphans server-side until then. Winners get their cover/author
   *       upserted so the server copy stays in sync.
   */
  async dedupeBooks(): Promise<number> {
    const db = await getDB();
    const books = await db.getAll("books");
    const quotes = await db.getAll("quotes");

    const groups = new Map<string, Book[]>();
    for (const b of books) {
      const key = normalizeTitle(b.title);
      if (!key) continue;
      const arr = groups.get(key);
      if (arr) arr.push(b);
      else groups.set(key, [b]);
    }

    let removed = 0;
    for (const [, group] of groups) {
      if (group.length < 2) continue;
      // Score each candidate. Higher is better.
      const score = (b: Book): number =>
        (b.cover_url ? 4 : 0) +
        (b.author ? 2 : 0) +
        (b.isbn ? 1 : 0) -
        // Break ties toward the oldest record (stable, more sync history).
        new Date(b.created_at).getTime() / 1e13;
      group.sort((a, b) => score(b) - score(a));
      const [winner, ...losers] = group;

      // Merge useful fields from losers into the winner opportunistically.
      let winnerChanged = false;
      const nextWinner: Book = { ...winner };
      for (const l of losers) {
        if (!nextWinner.author && l.author) {
          nextWinner.author = l.author;
          winnerChanged = true;
        }
        if (!nextWinner.cover_url && l.cover_url) {
          nextWinner.cover_url = l.cover_url;
          winnerChanged = true;
        }
        if (!nextWinner.isbn && l.isbn) {
          nextWinner.isbn = l.isbn;
          winnerChanged = true;
        }
        if (nextWinner.user_id === null && l.user_id) {
          nextWinner.user_id = l.user_id;
          winnerChanged = true;
        }
      }
      if (winnerChanged) {
        nextWinner.updated_at = nowIso();
        await db.put("books", nextWinner);
        await enqueue({ op: { type: "upsert_book", bookId: nextWinner.id } });
      }

      // Repoint every quote that pointed at a loser to the winner.
      const loserIds = new Set(losers.map((l) => l.id));
      for (const q of quotes) {
        if (q.book_id && loserIds.has(q.book_id)) {
          const updated = { ...q, book_id: nextWinner.id, updated_at: nowIso() };
          await db.put("quotes", updated);
          await enqueue({ op: { type: "upsert_quote", quoteId: q.id } });
        }
      }

      // Remove the losers locally.
      for (const l of losers) {
        await db.delete("books", l.id);
        removed += 1;
      }
    }

    if (removed > 0) console.info(`[repo.dedupeBooks] merged ${removed} duplicate book record(s)`);
    return removed;
  },

  /** Backfill user_id on all locally-owned (null user_id) records. */
  async assignOwnerToLocalRecords(userId: string) {
    const db = await getDB();
    const tx = db.transaction(["quotes", "books"], "readwrite");
    const quotes = await tx.objectStore("quotes").getAll();
    for (const q of quotes) {
      if (q.user_id === null) {
        const updated = { ...q, user_id: userId, updated_at: nowIso() };
        await tx.objectStore("quotes").put(updated);
        // re-enqueue
        const outboxTx = db.transaction("outbox", "readwrite");
        await outboxTx.store.put({
          id: uuid(),
          op: { type: "upsert_quote", quoteId: q.id },
          created_at: nowIso(),
          attempts: 0,
        });
        await outboxTx.done;
      }
    }
    const books = await tx.objectStore("books").getAll();
    for (const b of books) {
      if (b.user_id === null) {
        const updated = { ...b, user_id: userId, updated_at: nowIso() };
        await tx.objectStore("books").put(updated);
        const outboxTx = db.transaction("outbox", "readwrite");
        await outboxTx.store.put({
          id: uuid(),
          op: { type: "upsert_book", bookId: b.id },
          created_at: nowIso(),
          attempts: 0,
        });
        await outboxTx.done;
      }
    }
    await tx.done;
  },
};
