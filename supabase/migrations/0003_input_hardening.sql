-- =====================================================================
-- 0003 — Input hardening for launch
-- =====================================================================
-- Goal: defend the database against malformed/oversized input that
-- could slip past client-side validation, *without* invalidating any
-- existing rows. Every CHECK is added with `NOT VALID` so existing
-- records skip the initial scan; only new INSERTs/UPDATEs are
-- validated until we explicitly run `VALIDATE CONSTRAINT` (which can
-- be done at any time, off-peak, after we've manually audited stale
-- rows).
--
-- This file is idempotent: every constraint name is prefixed `q_`
-- and dropped before recreate, so the migration can be re-run safely.
--
-- Non-goals (deferred):
--   - Server-side rate limiting per-row write (needs pg_cron + Pro plan).
--   - Auth rate limits (live in Supabase Dashboard, not SQL).
-- =====================================================================

-- ---------- quotes.content ----------
-- Free Supabase row size is generous, but a 1MB quote is almost
-- certainly junk. 10k chars is ~3 typewritten pages — comfortable
-- ceiling for legitimate book quotes.
alter table public.quotes
  drop constraint if exists q_content_len;
alter table public.quotes
  add constraint q_content_len
  check (char_length(content) between 1 and 10000) not valid;

-- ---------- quotes.thoughts ----------
alter table public.quotes
  drop constraint if exists q_thoughts_len;
alter table public.quotes
  add constraint q_thoughts_len
  check (thoughts is null or char_length(thoughts) <= 10000) not valid;

-- ---------- quotes.page ----------
-- Books with negative or absurd page numbers are clearly garbage.
alter table public.quotes
  drop constraint if exists q_page_range;
alter table public.quotes
  add constraint q_page_range
  check (page is null or page between 0 and 99999) not valid;

-- ---------- books.title / author ----------
alter table public.books
  drop constraint if exists q_title_len;
alter table public.books
  add constraint q_title_len
  check (char_length(title) between 1 and 500) not valid;

alter table public.books
  drop constraint if exists q_author_len;
alter table public.books
  add constraint q_author_len
  check (author is null or char_length(author) <= 300) not valid;

-- ---------- books.cover_url ----------
-- A pathological cover_url could be megabytes. 2k is plenty for any
-- legitimate Google/Kakao/Naver thumbnail URL.
alter table public.books
  drop constraint if exists q_cover_url_len;
alter table public.books
  add constraint q_cover_url_len
  check (cover_url is null or char_length(cover_url) <= 2048) not valid;

-- ---------- books.isbn ----------
alter table public.books
  drop constraint if exists q_isbn_len;
alter table public.books
  add constraint q_isbn_len
  check (isbn is null or char_length(isbn) <= 32) not valid;

-- ---------- profiles.display_name ----------
alter table public.profiles
  drop constraint if exists q_display_name_len;
alter table public.profiles
  add constraint q_display_name_len
  check (display_name is null or char_length(display_name) <= 100) not valid;

-- ---------- tags.name ----------
alter table public.tags
  drop constraint if exists q_tag_name_len;
alter table public.tags
  add constraint q_tag_name_len
  check (char_length(name) between 1 and 50) not valid;

-- =====================================================================
-- Optional: validate now (uncomment after auditing existing rows).
-- =====================================================================
-- alter table public.quotes  validate constraint q_content_len;
-- alter table public.quotes  validate constraint q_thoughts_len;
-- alter table public.quotes  validate constraint q_page_range;
-- alter table public.books   validate constraint q_title_len;
-- alter table public.books   validate constraint q_author_len;
-- alter table public.books   validate constraint q_cover_url_len;
-- alter table public.books   validate constraint q_isbn_len;
-- alter table public.profiles validate constraint q_display_name_len;
-- alter table public.tags    validate constraint q_tag_name_len;

-- =====================================================================
-- Index hardening — speed up "load my recent quotes / books" which is
-- the hottest path. The init migration already covers the basics; we
-- add a partial index for "active" (non-deleted) quotes since the app
-- always filters them out and the planner picks the partial index for
-- selectivity wins.
-- =====================================================================
create index if not exists quotes_user_active_updated_idx
  on public.quotes(user_id, updated_at desc)
  where deleted_at is null;
