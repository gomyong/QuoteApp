# Quote — development work log

Summary of work on the `julive-your-intelligent-aesthetic-note` repository, refocused as **Quote**. Last updated: **2026-04-19**.

---

## Goals

- **Native apps**: iOS first, then Android, shared codebase via **Capacitor**.
- **Core UX**: while reading, capture a line you like using **on-device OCR**, then save quickly.
- **Sync**: **Supabase** (Postgres, Auth, Storage) with **offline-first** local storage (IndexedDB) and an outbox.
- **Future-friendly**: same React app for web/PWA and for XR-class browsers where applicable.

---

## Stack

- Vite, React, TypeScript, Tailwind, shadcn-ui.
- Capacitor 8, `@capacitor/camera`, `@pantrist/capacitor-plugin-ml-kit-text-recognition`, Tesseract.js (web fallback).
- Supabase JS client, TanStack Query (existing), `idb` for IndexedDB.
- App id: `app.quote.note`, display name: **Quote**.
- Secrets: `VITE_SUPABASE_*` in `.env.local` (not committed); `.env.example` only in git.

---

## Phase summary

### PR1 — Capacitor shell

- Added Capacitor iOS/Android, camera/filesystem/preferences/network/status-bar/splash-screen.
- `capacitor.config.ts`, `base: "./"` in Vite, **HashRouter** for WebView safety.
- npm scripts: `cap:sync`, `ios`, `android`, `ios:add`, `android:add`, `assets`, `ios:patch`.

### PR2 — Supabase and auth

- `src/lib/supabase.ts`: PKCE; native session in Capacitor Preferences.
- `AuthProvider`, `/signin`: **email magic link** only (MVP).
- SQL: `0001_init.sql` (profiles, books, quotes, tags, quote_tags, RLS, `quote-images` bucket policies).
- SQL: `0002_add_is_favorite.sql` (`quotes.is_favorite` for cross-device favorites).

### PR3–4 — OCR and capture flow

- `OcrService` + `getOcr()`: native ML Kit plugin vs web Tesseract.
- `pickImage`, `useOcr`, `QuoteSelector`, `CaptureFromImage`.
- Wired **Photo** on `Capture.tsx` to the full capture → OCR → sentence pick → fill flow.

### PR5 — Offline-first sync

- `src/sync/`: IndexedDB schema, `repo`, `syncEngine` (push outbox, pull by `updated_at`, LWW, image upload to Storage).
- `useSync`, `SyncMount` in `App.tsx`.
- `Settings`: account, **store source images** toggle (default **off**), manual sync.
- `Library` / `Index`: real data from local DB; `QuoteCard` favorite callback.

### PR6 — Release prep

- `@capacitor/assets`, `resources/` and `npm run assets`.
- `scripts/patch-ios-info-plist.mjs` for camera/photo usage strings.
- PWA: `public/manifest.webmanifest`, `index.html` meta and apple-touch-icon link.
- Vite `manualChunks` to split vendor/react/radix/motion/data/ocr-web/db.
- `DEPLOYMENT.md`, refreshed `README.md`.

---

## Follow-ups (not done yet)

- Deep link / universal link for magic link return to the native app (`app.quote.note://` + Supabase redirect URLs).
- PWA icon PNGs: add files under `public/icons/` per `public/icons/README.md`.
- Voice (STT): still disabled in UI; can add Capacitor speech or Web Speech API later.

---

## Key paths

| Area | Path |
|------|------|
| Capacitor | `capacitor.config.ts` |
| OCR | `src/features/ocr/` |
| Sync | `src/sync/` |
| Migrations | `supabase/migrations/` |
| Deploy | `DEPLOYMENT.md` |

---

*This log was produced from the implementation work in this repository.*
