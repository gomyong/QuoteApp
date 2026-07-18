export type ISODateString = string;

export type Quote = {
  id: string;
  user_id: string | null;
  book_id: string | null;
  content: string;
  thoughts: string | null;
  page: number | null;
  source_image_path: string | null;
  is_favorite: boolean;
  captured_at: ISODateString;
  created_at: ISODateString;
  updated_at: ISODateString;
  deleted_at: ISODateString | null;
};

export type Book = {
  id: string;
  user_id: string | null;
  title: string;
  author: string | null;
  isbn: string | null;
  cover_url: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
};

export type LocalImage = {
  id: string;
  quote_id: string;
  base64: string;
  mime: string;
  created_at: ISODateString;
};

export type OutboxOp =
  | { type: "upsert_quote"; quoteId: string }
  | { type: "delete_quote"; quoteId: string }
  | { type: "upsert_book"; bookId: string }
  | { type: "upload_image"; imageId: string };

export type OutboxEntry = {
  id: string;
  op: OutboxOp;
  created_at: ISODateString;
  attempts: number;
  last_error?: string | null;
};

/** Outbox ops that failed too many times — kept for diagnostics / retry. */
export type DeadLetterEntry = {
  id: string;
  op: OutboxOp;
  created_at: ISODateString;
  failed_at: ISODateString;
  attempts: number;
  last_error: string | null;
};

export type Settings = {
  storeImages: boolean;
};

export type MetaKey = "lastPulledAt" | "deviceId" | "deadLetter";
