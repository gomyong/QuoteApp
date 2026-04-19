# Supabase setup

This folder contains SQL migrations for the Quote app backend.

## Apply the schema

You can apply `migrations/0001_init.sql` in either way:

### Option A — Supabase Dashboard (fastest)

1. Open your project: https://supabase.com/dashboard/project/ugzwobdupgajmzkplvel
2. Go to **SQL Editor** → **New query**
3. Paste the contents of `migrations/0001_init.sql`
4. Run

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
