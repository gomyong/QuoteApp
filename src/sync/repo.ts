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

const upsertBookByTitle = async (
  title: string,
  author: string | null,
  userId: string | null,
): Promise<Book> => {
  const db = await getDB();
  const all = await db.getAllFromIndex("books", "by_title");
  const found = all.find(
    (b) => b.title.trim() === title.trim() && (b.author ?? null) === (author ?? null) && !b.user_id === !userId,
  );
  if (found) return found;
  const book: Book = {
    id: uuid(),
    user_id: userId,
    title: title.trim(),
    author: author?.trim() || null,
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
