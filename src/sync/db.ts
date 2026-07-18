import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Book, LocalImage, OutboxEntry, Quote } from "./types";

interface QuoteDB extends DBSchema {
  quotes: {
    key: string;
    value: Quote;
    indexes: { by_updated_at: string; by_book: string };
  };
  books: {
    key: string;
    value: Book;
    indexes: { by_updated_at: string; by_title: string };
  };
  outbox: {
    key: string;
    value: OutboxEntry;
    indexes: { by_created_at: string };
  };
  images: {
    key: string;
    value: LocalImage;
    indexes: { by_quote: string };
  };
  meta: {
    key: string;
    value: { key: string; value: string };
  };
  settings: {
    key: string;
    value: { key: string; value: unknown };
  };
}

let dbPromise: Promise<IDBPDatabase<QuoteDB>> | null = null;

export const getDB = (): Promise<IDBPDatabase<QuoteDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<QuoteDB>("quote-app", 1, {
      upgrade(db) {
        const quotes = db.createObjectStore("quotes", { keyPath: "id" });
        quotes.createIndex("by_updated_at", "updated_at");
        quotes.createIndex("by_book", "book_id");

        const books = db.createObjectStore("books", { keyPath: "id" });
        books.createIndex("by_updated_at", "updated_at");
        books.createIndex("by_title", "title");

        const outbox = db.createObjectStore("outbox", { keyPath: "id" });
        outbox.createIndex("by_created_at", "created_at");

        const images = db.createObjectStore("images", { keyPath: "id" });
        images.createIndex("by_quote", "quote_id");

        db.createObjectStore("meta", { keyPath: "key" });
        db.createObjectStore("settings", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
};

/** Close the cached handle so the next getDB() opens a fresh DB (after wipe). */
export const resetDBHandle = async (): Promise<void> => {
  if (!dbPromise) return;
  try {
    const db = await dbPromise;
    db.close();
  } catch {
    /* ignore — DB may already be deleted */
  }
  dbPromise = null;
};
