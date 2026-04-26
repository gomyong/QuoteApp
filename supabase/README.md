# Supabase setup

This folder contains SQL migrations for the Quote app backend.

## Apply the schema

Migrations live in `migrations/` and are numbered. **Apply them in
order** the first time you set up a project; subsequent runs only
need newly added files.

| #    | File                            | Purpose                                                        |
| ---- | ------------------------------- | -------------------------------------------------------------- |
| 0001 | `0001_init.sql`                 | Tables (`profiles`, `books`, `quotes`, `tags`), RLS, storage   |
| 0002 | `0002_add_is_favorite.sql`      | Add `is_favorite` column to `quotes`                           |
| 0003 | `0003_input_hardening.sql`      | Length / range CHECK constraints (`NOT VALID`) + partial index |

### Option A — Supabase Dashboard (fastest)

1. Open your project: https://supabase.com/dashboard/project/ugzwobdupgajmzkplvel
2. Go to **SQL Editor** → **New query**
3. Paste the contents of each migration file (in order) and run.

### Option B — Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref ugzwobdupgajmzkplvel
npx supabase db push
```

## Configure Auth (magic link)

In **Authentication → URL Configuration**:

- Site URL: your deployed web URL (or `http://localhost:8080` for dev)
- Additional Redirect URLs: include the same URLs you'll use for native (e.g.
  `app.quote.note://` once we wire deep links). For now, the web/origin URL is enough.

In **Authentication → Email templates → Magic Link**, ensure the `{{ .ConfirmationURL }}`
is used. The default works.

## Storage

The migration creates a private bucket `quote-images` and per-user RLS policies that
require objects to be stored under `{user_id}/...`.

## Pre-launch security checklist (Dashboard items)

These settings live in the Supabase Dashboard, not SQL — review them
once before opening signups to the public.

1. **Authentication → Providers → Email**
   - **Confirm email** ON
   - **Secure email change** ON (requires re-auth on email change)
2. **Authentication → Rate limits**
   - Magic link: 4 / hour per IP (default is fine for solo, raise gradually)
   - Sign-ups: 30 / hour per IP
3. **Authentication → URL Configuration**
   - Site URL = production web origin
   - Additional Redirect URLs include `app.quote.note://login-callback`
4. **Project Settings → API → JWT Settings**
   - JWT expiry: 3600s (1h) is fine; refresh handles the rest.
5. **Project Settings → Database → Connection pooling**
   - Mode: `Transaction` (default)
   - Max client connections: 200 (free) — leave default until DAU > 1k.
6. **Storage → quote-images**
   - File size limit: 5 MB (covers the OCR source images).
   - Allowed MIME types: `image/jpeg, image/png, image/heic, image/webp`.
