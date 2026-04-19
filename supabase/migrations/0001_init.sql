-- =====================================================================
-- Quote app — initial schema
-- Run in: Supabase Dashboard → SQL Editor (or via supabase CLI)
-- Idempotent where reasonable. Safe to re-run.
-- =====================================================================

-- Required extensions
create extension if not exists "pgcrypto";

-- ---------- Helper: updated_at trigger ----------
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- =====================================================================
-- profiles  (1:1 with auth.users)
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.tg_set_updated_at();

-- Auto-create profile on signup
create or replace function public.tg_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.tg_handle_new_user();

-- =====================================================================
-- books
-- =====================================================================
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  isbn text,
  cover_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists books_user_id_idx on public.books(user_id);
create index if not exists books_user_updated_idx on public.books(user_id, updated_at desc);

drop trigger if exists set_updated_at on public.books;
create trigger set_updated_at before update on public.books
  for each row execute procedure public.tg_set_updated_at();

-- =====================================================================
-- quotes
-- =====================================================================
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid references public.books(id) on delete set null,
  content text not null,
  thoughts text,
  page int,
  source_image_path text,
  captured_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create index if not exists quotes_user_id_idx on public.quotes(user_id);
create index if not exists quotes_user_updated_idx on public.quotes(user_id, updated_at desc);
create index if not exists quotes_user_book_idx on public.quotes(user_id, book_id);

drop trigger if exists set_updated_at on public.quotes;
create trigger set_updated_at before update on public.quotes
  for each row execute procedure public.tg_set_updated_at();

-- =====================================================================
-- tags + quote_tags
-- =====================================================================
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, name)
);

create index if not exists tags_user_id_idx on public.tags(user_id);

create table if not exists public.quote_tags (
  quote_id uuid not null references public.quotes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (quote_id, tag_id)
);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.quotes enable row level security;
alter table public.tags enable row level security;
alter table public.quote_tags enable row level security;

-- profiles: only owner
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

-- books / quotes / tags: only owner
do $$
declare t text;
begin
  foreach t in array array['books', 'quotes', 'tags'] loop
    execute format('drop policy if exists "%I_select_own" on public.%I', t, t);
    execute format('create policy "%I_select_own" on public.%I for select using (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%I_insert_own" on public.%I', t, t);
    execute format('create policy "%I_insert_own" on public.%I for insert with check (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%I_update_own" on public.%I', t, t);
    execute format('create policy "%I_update_own" on public.%I for update using (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%I_delete_own" on public.%I', t, t);
    execute format('create policy "%I_delete_own" on public.%I for delete using (auth.uid() = user_id)', t, t);
  end loop;
end $$;

-- quote_tags: owner verified via parent quote
drop policy if exists "quote_tags_select_own" on public.quote_tags;
create policy "quote_tags_select_own" on public.quote_tags
  for select using (
    exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = auth.uid())
  );

drop policy if exists "quote_tags_modify_own" on public.quote_tags;
create policy "quote_tags_modify_own" on public.quote_tags
  for all using (
    exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = auth.uid())
  );

-- =====================================================================
-- Storage bucket: quote-images  (private, per-user folder)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('quote-images', 'quote-images', false)
on conflict (id) do nothing;

-- Object path convention: {user_id}/{quote_id or uuid}.{ext}
drop policy if exists "quote_images_read_own" on storage.objects;
create policy "quote_images_read_own"
  on storage.objects for select
  using (
    bucket_id = 'quote-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "quote_images_write_own" on storage.objects;
create policy "quote_images_write_own"
  on storage.objects for insert
  with check (
    bucket_id = 'quote-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "quote_images_update_own" on storage.objects;
create policy "quote_images_update_own"
  on storage.objects for update
  using (
    bucket_id = 'quote-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "quote_images_delete_own" on storage.objects;
create policy "quote_images_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'quote-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
