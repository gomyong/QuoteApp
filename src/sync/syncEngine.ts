import { supabase } from "@/lib/supabase";
import { repo } from "./repo";
import type { Book, OutboxEntry, Quote } from "./types";

const BUCKET = "quote-images";

let runningPromise: Promise<void> | null = null;

const decodeBase64 = (b64: string): Uint8Array => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const isOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);

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
  const all = await repo.listBooks();
  const b = all.find((x) => x.id === id);
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
  if (!img) return;
  const ext = img.mime.includes("png") ? "png" : img.mime.includes("webp") ? "webp" : "jpg";
  const path = `${userId}/${img.quote_id}.${ext}`;
  const blob = new Blob([decodeBase64(img.base64)], { type: img.mime || "image/jpeg" });
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: img.mime || "image/jpeg" });
  if (upErr) throw upErr;
  const q = await repo.getQuote(img.quote_id);
  if (q) {
    const updated: Quote = { ...q, source_image_path: path, updated_at: new Date().toISOString() };
    await repo.putQuote(updated);
  }
  await repo.deleteImage(imageId);
  const { error: qErr } = await supabase
    .from("quotes")
    .update({ source_image_path: path })
    .eq("id", img.quote_id);
  if (qErr) throw qErr;
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

const pushOutbox = async (userId: string): Promise<void> => {
  const entries = await repo.listOutbox();
  for (const entry of entries) {
    try {
      await applyOutboxEntry(entry, userId);
      await repo.deleteOutbox(entry.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const next = { ...entry, attempts: entry.attempts + 1, last_error: msg };
      await repo.putOutboxEntry(next);
      if (next.attempts >= 5) {
        console.warn("[sync] dropping entry after 5 attempts", next);
        await repo.deleteOutbox(entry.id);
      } else {
        break;
      }
    }
  }
};

const pullChanges = async (userId: string): Promise<void> => {
  const lastPulledAt = (await repo.getMeta("lastPulledAt")) ?? "1970-01-01T00:00:00.000Z";

  const { data: quotes, error: qErr } = await supabase
    .from("quotes")
    .select("*")
    .eq("user_id", userId)
    .gt("updated_at", lastPulledAt)
    .order("updated_at", { ascending: true })
    .limit(500);
  if (qErr) throw qErr;

  for (const remote of quotes ?? []) {
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
        is_favorite: typeof remote.is_favorite === "boolean" ? remote.is_favorite : (local?.is_favorite ?? false),
        captured_at: remote.captured_at,
        created_at: remote.created_at,
        updated_at: remote.updated_at,
        deleted_at: remote.deleted_at,
      };
      await repo.putQuote(merged);
    }
  }

  const { data: books, error: bErr } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", userId)
    .gt("updated_at", lastPulledAt)
    .order("updated_at", { ascending: true })
    .limit(500);
  if (bErr) throw bErr;

  for (const remote of books ?? []) {
    const local = (await repo.listBooks()).find((b) => b.id === remote.id);
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
    }
  }

  await repo.setMeta("lastPulledAt", new Date().toISOString());
};

export const syncOnce = async (): Promise<void> => {
  if (runningPromise) return runningPromise;
  if (!isOnline()) return;
  const userId = await getCurrentUserId();
  if (!userId) return;

  runningPromise = (async () => {
    try {
      await pushOutbox(userId);
      await pullChanges(userId);
    } catch (e) {
      console.warn("[sync] failed", e);
    } finally {
      runningPromise = null;
    }
  })();

  return runningPromise;
};
