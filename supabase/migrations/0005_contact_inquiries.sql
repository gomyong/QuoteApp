-- =====================================================================
-- Quote landing — public contact form submissions
-- Run in: Supabase Dashboard → SQL Editor
-- Idempotent. Safe to re-run.
-- =====================================================================

create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint contact_inquiries_name_len check (char_length(name) between 1 and 100),
  constraint contact_inquiries_email_len check (char_length(email) between 3 and 254),
  constraint contact_inquiries_message_len check (char_length(message) between 1 and 4000)
);

create index if not exists contact_inquiries_created_at_idx
  on public.contact_inquiries (created_at desc);

alter table public.contact_inquiries enable row level security;

-- Anyone (landing page) may insert; no public read.
drop policy if exists "contact_inquiries_anon_insert" on public.contact_inquiries;
create policy "contact_inquiries_anon_insert"
  on public.contact_inquiries
  for insert
  to anon, authenticated
  with check (
    char_length(trim(name)) between 1 and 100
    and char_length(trim(email)) between 3 and 254
    and char_length(trim(message)) between 1 and 4000
  );

-- Explicitly no SELECT/UPDATE/DELETE for anon/authenticated.
-- View rows in Dashboard (service role) or SQL Editor.

comment on table public.contact_inquiries is
  'Landing-page contact form. Insert via anon key; read only in Dashboard.';
