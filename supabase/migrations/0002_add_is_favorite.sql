-- Add favorite flag for quotes
alter table public.quotes
  add column if not exists is_favorite boolean not null default false;
