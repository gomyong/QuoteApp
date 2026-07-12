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
| 0004 | `0004_delete_own_account.sql`   | `delete_own_account()` RPC for App Store account deletion      |
| 0005 | `0005_contact_inquiries.sql`    | Landing contact form table (anon insert-only RLS)              |

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

## Configure Auth (magic link + OTP)

In **Authentication → URL Configuration**:

| Field | Value |
| ----- | ----- |
| Site URL | Your web origin (or `http://localhost:8080` for local web) |
| Additional Redirect URLs | **`app.quote.note://auth/callback`** (required for native magic-link return) |

Also add any web origins you use (e.g. `http://localhost:8080/#/`).

> **Important:** The correct native callback is `app.quote.note://auth/callback`.
> Do **not** use `login-callback` — that was an outdated docs typo and does not
> match the app (`AuthProvider.tsx` / `DeepLinkHandler.tsx`).
>
> OTP code login in the app works even if the redirect URL is wrong. Magic-link
> tap-to-open only works when this URL is whitelisted.

In **Authentication → Email Templates → Magic Link**, include both:

- `{{ .ConfirmationURL }}` (link)
- `{{ .Token }}` (numeric code)

Example line (no fixed digit count — Supabase may use 6–10 digits):

```html
<p>Or enter this code in the app:</p>
<p style="font-size:22px;font-weight:bold;letter-spacing:4px;">{{ .Token }}</p>
```

## Storage

The migration creates a private bucket `quote-images` and per-user RLS policies that
require objects to be stored under `{user_id}/...`.

Account deletion (`delete_own_account`) also removes that user’s objects in this bucket.

## Landing contact form

Migration `0005_contact_inquiries.sql` creates `public.contact_inquiries`.

- The GitHub Pages landing (`docs/`) posts via the **anon** key.
- RLS allows **INSERT only** for `anon` / `authenticated`. There is no public SELECT.
- Read submissions in Dashboard → **Table Editor** → `contact_inquiries`.
- Config: `docs/js/supabase-config.js` (see `supabase-config.example.js`).

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
   - Site URL = production web origin (or localhost for now)
   - Additional Redirect URLs include **`app.quote.note://auth/callback`**
4. **Project Settings → API → JWT Settings**
   - JWT expiry: 3600s (1h) is fine; refresh handles the rest.
5. **Project Settings → Database → Connection pooling**
   - Mode: `Transaction` (default)
   - Max client connections: 200 (free) — leave default until DAU > 1k.
6. **Storage → quote-images**
   - File size limit: 5 MB (covers the OCR source images).
   - Allowed MIME types: `image/jpeg, image/png, image/heic, image/webp`.
7. **SQL:** confirm migrations **0001–0004** have all been applied.
