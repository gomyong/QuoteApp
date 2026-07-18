import { supabase } from "@/lib/supabase";
import { repo } from "./repo";
import type { Book, OutboxEntry, Quote } from "./types";

const BUCKET = "quote-images";

let runningPromise: Promise<void> | null = null;

/**
 * Observable sync status for the UI (Settings "sync panel").
 * Pure in-memory — resets on app relaunch, which is fine since this is
 * diagnostic info, not durable state.
 */
export type SyncStatus = {
  phase: "idle" | "pushing" | "pulling" | "error";
  lastSyncAt: string | null;
  lastError: string | null;
  pushed: number; // number of outbox entries successfully sent in last run
  pulledQuotes: number;
  pulledBooks: number;
  pendingOutbox: number;
  /** Ops that failed ≥5 times and need attention / retry. */
  deadLetterCount: number;
  isOnline: boolean;
  isAuthenticated: boolean;
};

const defaultStatus: SyncStatus = {
  phase: "idle",
  lastSyncAt: null,
  lastError: null,
  pushed: 0,
  pulledQuotes: 0,
  pulledBooks: 0,
  pendingOutbox: 0,
  deadLetterCount: 0,
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isAuthenticated: false,
};

let status: SyncStatus = defaultStatus;
const listeners = new Set<(s: SyncStatus) => void>();

const emit = (patch: Partial<SyncStatus>) => {
  status = { ...status, ...patch };
  for (const l of listeners) {
    try {
      l(status);
    } catch (e) {
      console.warn("[sync] listener threw", e);
    }
  }
};

export const getSyncStatus = (): SyncStatus => status;

export const subscribeSyncStatus = (fn: (s: SyncStatus) => void): (() => void) => {
  listeners.add(fn);
  // Emit current immediately so subscribers can render.
  fn(status);
  return () => {
    listeners.delete(fn);
  };
};

const decodeBase64 = (b64: string): Uint8Array => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const isOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);

/**
 * Supabase returns plain objects (e.g. PostgrestError) rather than Error
 * instances, so `String(e)` yields useless "[object Object]". This extracts
 * a human-readable string with all the useful fields.
 */
const describeError = (e: unknown): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof o.message === "string") parts.push(o.message);
    if (typeof o.code === "string") parts.push(`code=${o.code}`);
    else if (typeof o.status === "number") parts.push(`status=${o.status}`);
    if (typeof o.details === "string") parts.push(o.details);
    if (typeof o.hint === "string") parts.push(`hint: ${o.hint}`);
    if (parts.length > 0) return parts.join(" | ");
    try {
      return JSON.stringify(e);
    } catch {
      return "[object]";
    }
  }
  return String(e);
};

const getCurrentUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
};

const pushQuote = async (id: string, userId: string) => {
  const q = await repo.getQuote(id);
  if (!q) return;
  const payload = {
    id: q.id,
    user_id: userId,
    book_id: q.book_id,
    content: q.content,
    thoughts: q.thoughts,
    page: q.page,
    source_image_path: q.source_image_path,
    is_favorite: q.is_favorite,
    captured_at: q.captured_at,
    created_at: q.created_at,
    updated_at: q.updated_at,
    deleted_at: q.deleted_at,
  };
  const { error } = await supabase.from("quotes").upsert(payload, { onConflict: "id" });
  if (error) throw error;
};

const pushBook = async (id: string, userId: string) => {
  const b = await repo.getBook(id);
  if (!b) return;
  const payload: Partial<Book> & { id: string; user_id: string } = {
    id: b.id,
    user_id: userId,
    title: b.title,
    author: b.author,
    isbn: b.isbn,
    cover_url: b.cover_url,
    created_at: b.created_at,
    updated_at: b.updated_at,
  };
  const { error } = await supabase.from("books").upsert(payload, { onConflict: "id" });
  if (error) throw error;
};

const deleteQuoteRemote = async (id: string) => {
  const { error } = await supabase
    .from("quotes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

const uploadImage = async (imageId: string, userId: string) => {
  const img = await repo.getImage(imageId);
  if (!img) {
    // Local blob already gone. Do not treat as success — park in dead letter
    // after retries rather than silently clearing the outbox entry.
    throw new Error(`local image missing: ${imageId}`);
  }
  const ext = img.mime.includes("png") ? "png" : img.mime.includes("webp") ? "webp" : "jpg";
  const path = `${userId}/${img.quote_id}.${ext}`;
  const blob = new Blob([decodeBase64(img.base64)], { type: img.mime || "image/jpeg" });
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: img.mime || "image/jpeg" });
  if (upErr) throw upErr;

  // Confirm remote quote path BEFORE deleting local bytes.
  const { error: qErr } = await supabase
    .from("quotes")
    .update({ source_image_path: path })
    .eq("id", img.quote_id);
  if (qErr) throw qErr;

  const q = await repo.getQuote(img.quote_id);
  if (q) {
    const updated: Quote = { ...q, source_image_path: path, updated_at: new Date().toISOString() };
    await repo.putQuote(updated);
  }
  await repo.deleteImage(imageId);
};

const applyOutboxEntry = async (entry: OutboxEntry, userId: string) => {
  switch (entry.op.type) {
    case "upsert_quote":
      await pushQuote(entry.op.quoteId, userId);
      break;
    case "upsert_book":
      await pushBook(entry.op.bookId, userId);
      break;
    case "delete_quote":
      await deleteQuoteRemote(entry.op.quoteId);
      break;
    case "upload_image":
      await uploadImage(entry.op.imageId, userId);
      break;
  }
};

/**
 * Relative processing order per outbox op type. Lower numbers go first.
 *
 * `upsert_book` must precede `upsert_quote` because `quotes.book_id` has a
 * foreign key to `books.id` on Supabase — sending a quote before its book
 * is inserted results in an FK violation and a failed cycle. Within each
 * tier we preserve the original insertion order so retries look natural.
 */
const OP_ORDER: Record<string, number> = {
  upsert_book: 0,
  upsert_quote: 1,
  upload_image: 2,
  delete_quote: 3,
};

const pushOutbox = async (userId: string): Promise<number> => {
  const raw = await repo.listOutbox();
  // Stable sort: (op tier, then insertion order via created_at).
  const entries = [...raw].sort((a, b) => {
    const da = OP_ORDER[a.op.type] ?? 99;
    const db = OP_ORDER[b.op.type] ?? 99;
    if (da !== db) return da - db;
    return a.created_at.localeCompare(b.created_at);
  });

  console.info(`[sync] push: ${entries.length} outbox entr${entries.length === 1 ? "y" : "ies"}`);
  let pushed = 0;
  for (const entry of entries) {
    try {
      await applyOutboxEntry(entry, userId);
      await repo.deleteOutbox(entry.id);
      pushed += 1;
    } catch (e) {
      const msg = describeError(e);
      console.warn(`[sync] push failed (${entry.op.type}):`, msg, e);
      const next = { ...entry, attempts: entry.attempts + 1, last_error: msg };
      await repo.putOutboxEntry(next);
      if (next.attempts >= 5) {
        // Preserve for diagnostics / manual retry — never silent-drop.
        console.warn("[sync] moving entry to dead letter after 5 attempts", next);
        await repo.addDeadLetter({
          id: next.id,
          op: next.op,
          created_at: next.created_at,
          failed_at: new Date().toISOString(),
          attempts: next.attempts,
          last_error: msg,
        });
        await repo.deleteOutbox(entry.id);
        // Continue with remaining entries — this one is parked.
        continue;
      }
      // Stop at first retryable failure so we don't amplify errors.
      throw new Error(`push halted after ${pushed} entries: ${msg}`);
    }
  }
  return pushed;
};

const PAGE = 500;

const maxIso = (a: string, b: string): string => (a > b ? a : b);

const pullChanges = async (userId: string): Promise<{ quotes: number; books: number }> => {
  const lastPulledAt = (await repo.getMeta("lastPulledAt")) ?? "1970-01-01T00:00:00.000Z";
  let cursor = lastPulledAt;
  let maxSeen = lastPulledAt;
  let pulledQuotes = 0;
  let pulledBooks = 0;

  // Page until a batch returns < PAGE rows so we never advance past unpulled work.
  for (;;) {
    const { data: quotes, error: qErr } = await supabase
      .from("quotes")
      .select("*")
      .eq("user_id", userId)
      .gt("updated_at", cursor)
      .order("updated_at", { ascending: true })
      .limit(PAGE);
    if (qErr) throw qErr;
    const batch = quotes ?? [];
    for (const remote of batch) {
      maxSeen = maxIso(maxSeen, remote.updated_at);
      const local = await repo.getQuote(remote.id);
      if (!local || local.updated_at <= remote.updated_at) {
        const merged: Quote = {
          id: remote.id,
          user_id: remote.user_id,
          book_id: remote.book_id,
          content: remote.content,
          thoughts: remote.thoughts,
          page: remote.page,
          source_image_path: remote.source_image_path,
          is_favorite:
            typeof remote.is_favorite === "boolean"
              ? remote.is_favorite
              : (local?.is_favorite ?? false),
          captured_at: remote.captured_at,
          created_at: remote.created_at,
          updated_at: remote.updated_at,
          deleted_at: remote.deleted_at,
        };
        await repo.putQuote(merged);
        pulledQuotes += 1;
      }
    }
    if (batch.length === 0) break;
    cursor = batch[batch.length - 1].updated_at;
    if (batch.length < PAGE) break;
  }

  cursor = lastPulledAt;
  for (;;) {
    const { data: books, error: bErr } = await supabase
      .from("books")
      .select("*")
      .eq("user_id", userId)
      .gt("updated_at", cursor)
      .order("updated_at", { ascending: true })
      .limit(PAGE);
    if (bErr) throw bErr;
    const batch = books ?? [];
    for (const remote of batch) {
      maxSeen = maxIso(maxSeen, remote.updated_at);
      const local = await repo.getBook(remote.id);
      if (!local || local.updated_at <= remote.updated_at) {
        await repo.putBook({
          id: remote.id,
          user_id: remote.user_id,
          title: remote.title,
          author: remote.author,
          isbn: remote.isbn,
          cover_url: remote.cover_url,
          created_at: remote.created_at,
          updated_at: remote.updated_at,
        });
        pulledBooks += 1;
      }
    }
    if (batch.length === 0) break;
    cursor = batch[batch.length - 1].updated_at;
    if (batch.length < PAGE) break;
  }

  // Advance to the newest pulled row timestamp — never wall-clock "now".
  await repo.setMeta("lastPulledAt", maxSeen);
  console.info(`[sync] pull: ${pulledQuotes} quote(s), ${pulledBooks} book(s)`);
  return { quotes: pulledQuotes, books: pulledBooks };
};

const refreshQueueCounts = async (): Promise<{
  pendingOutbox: number;
  deadLetterCount: number;
}> => ({
  pendingOutbox: await repo.outboxSize(),
  deadLetterCount: (await repo.listDeadLetters()).length,
});

export const syncOnce = async (): Promise<void> => {
  if (runningPromise) return runningPromise;

  const online = isOnline();
  emit({ isOnline: online });
  if (!online) {
    emit(await refreshQueueCounts());
    return;
  }

  const userId = await getCurrentUserId();
  emit({ isAuthenticated: !!userId });
  if (!userId) {
    // Not signed in — record queue size so the user can see what'll get
    // synced after they log in, but don't touch the network.
    emit(await refreshQueueCounts());
    return;
  }

  runningPromise = (async () => {
    try {
      emit({ phase: "pushing", lastError: null });
      const pushed = await pushOutbox(userId);
      emit({ phase: "pulling", pushed });
      const { quotes: pq, books: pb } = await pullChanges(userId);
      emit({
        phase: "idle",
        pulledQuotes: pq,
        pulledBooks: pb,
        ...(await refreshQueueCounts()),
        lastSyncAt: new Date().toISOString(),
      });
    } catch (e) {
      const msg = describeError(e);
      console.warn("[sync] failed", msg, e);
      emit({
        phase: "error",
        lastError: msg,
        ...(await refreshQueueCounts()),
      });
    } finally {
      runningPromise = null;
    }
  })();

  return runningPromise;
};

/** Re-queue every dead-letter entry and run a sync cycle. */
export const retryDeadLetters = async (): Promise<number> => {
  const letters = await repo.listDeadLetters();
  let n = 0;
  for (const letter of letters) {
    if (await repo.retryDeadLetter(letter.id)) n += 1;
  }
  if (n > 0) await syncOnce();
  else emit(await refreshQueueCounts());
  return n;
};

// Keep status.isOnline in sync with the browser signal even when no sync
// is running, so the Settings panel reflects reality immediately.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => emit({ isOnline: true }));
  window.addEventListener("offline", () => emit({ isOnline: false }));
}
