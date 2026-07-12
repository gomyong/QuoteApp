-- =====================================================================
-- Quote app — allow authenticated users to delete their own account
-- Apple App Store Guideline 5.1.1(v) requires in-app account deletion.
--
-- Run in: Supabase Dashboard → SQL Editor
-- Idempotent. Safe to re-run.
-- =====================================================================

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  -- Remove uploaded OCR / source images under {user_id}/...
  delete from storage.objects
  where bucket_id = 'quote-images'
    and (storage.foldername(name))[1] = uid::text;

  -- Cascades to profiles, books, quotes, tags, quote_tags (ON DELETE CASCADE)
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

comment on function public.delete_own_account() is
  'Deletes the calling user, their cloud rows (cascade), and quote-images storage objects.';
