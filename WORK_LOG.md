# Quote — development work log

Summary of work on the `julive-your-intelligent-aesthetic-note` repository, refocused as **Quote**. Last updated: **2026-04-20**.

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

## PR7 — iOS WebView blank-screen hardening

Symptom: After `npm run ios`, the simulator showed only the dark splash
background with a thin white strip at the bottom. Nothing rendered.

Root cause: `vite.config.ts` was using `build.rollupOptions.output.manualChunks`
to split React, Radix, framer-motion, supabase, etc. into separate chunks. In
the iOS WKWebView this broke ES module evaluation order — non-React chunks
were evaluated before the React chunk had finished initializing, surfacing as
runtime crashes such as:

- `TypeError: undefined is not an object (evaluating 'D.createContext')`
- `TypeError: undefined is not an object (evaluating 'b.forwardRef')`

Because the React tree threw during mount, `<div id="root">` stayed empty and
the WKWebView's default white background bled through under the body.

Fix:

- Removed `manualChunks` entirely. Vite/Rollup's automatic code-splitting at
  every dynamic `import()` boundary is sufficient; OCR (`tesseract.js`), the
  native OCR adapter, and the image picker are already lazy-loaded.
- Added `resolve.dedupe: ["react", "react-dom", "react-router-dom", "scheduler"]`
  to guarantee a single React instance across the dependency graph.
- Hardened `src/lib/supabase.ts` with `safeCreateClient()` so missing env vars
  or storage adapter errors no longer throw at import time.
- Wrapped `AuthProvider`'s `getSession()` / `onAuthStateChange()` in
  try/catch so first-paint never depends on a network round trip.
- Added a defensive boot-error overlay and dark-bg fallback in `index.html`,
  so any future mount failure is visible in-app instead of leaving a
  blank screen.

Verified: clean `npm run cap:sync` build produces a single main chunk plus
small dynamic chunks for OCR, and the iOS Simulator (iPhone 17 Pro / iOS 26.4)
renders the home screen normally.

---

## PR8 — On-device OCR fixes: modal touch, permissions, Apple Vision

Three things broke in sequence on the real iPhone the first time the user
tried OCR. Each one is fixed end-to-end.

### 8.1 — "사진" 모달 안의 카메라/사진 버튼이 터치되지 않음

Cause: `CaptureFromImage` modal used `z-40`, but `BottomNav` was `z-50`. The
nav also has a `motion.div` indicator with `absolute -top-2` that renders
just above the nav bar, which on a small viewport intercepts taps inside
the modal. Sonner's portal also injects a high-z fixed container that can
swallow taps in the WKWebView.

Fix:
- Modal lifted to `z-[60]`, content placed in its own stacking context
  (`relative z-10`), and `touch-action: manipulation` added to the
  container and all action buttons.
- All buttons get `type="button"` + `cursor-pointer` so iOS WKWebView
  reliably routes the tap.
- `BottomNav` is now hidden while the OCR modal is open
  (`{!showOcr && <BottomNav />}`) so there's no z-index race at all.

### 8.2 — `NSPhotoLibraryAddUsageDescription` missing → Camera plugin refuses to run

`Info.plist` had Camera + Photo Library read permissions but not the "save
to library" one. `@capacitor/camera` requires it whenever the camera is
invoked. Re-ran `npm run ios:patch`, which idempotently added the missing
key with a Korean usage string.

### 8.3 — "plugin not implemented on ios" → garbled Korean OCR

`@pantrist/capacitor-plugin-ml-kit-text-recognition` ships only a CocoaPods
podspec (no `Package.swift`). Capacitor 8's iOS project is SPM-mode, so the
plugin silently failed to register. The OCR pipeline therefore fell all the
way through to `tesseract.js`, which (a) downloads its language packs from
a CDN that the WKWebView origin (`capacitor://localhost`) can't reach
(`Updated list with error: DownloadFailed` x6) and (b) is much less
accurate on Korean than Apple Vision anyway.

The structural fix was to own the OCR plugin instead of depending on a
third-party one:

- Removed `@pantrist/capacitor-plugin-ml-kit-text-recognition` from
  `package.json`.
- Added a tiny in-app Capacitor plugin
  `ios/App/App/AppleVisionOcrPlugin.swift` (~140 LoC) that wraps
  `VNRecognizeTextRequest`. Korean is officially supported on iOS 16+
  with the same engine as system Live Text; no model download, works
  offline, 0 MB app-size impact.
- Forced Korean+English (`recognitionLanguages = ["ko-KR", "en-US"]`,
  `automaticallyDetectsLanguage = false`) because auto-detect frequently
  mis-classifies Hangul and ruins accuracy.
- New JS adapter `src/features/ocr/ocr.native.ts` calls the plugin via
  `registerPlugin<AppleVisionOcrPlugin>("AppleVisionOcr")`.

### 8.4 — In-app plugin not picked up by Capacitor 8 SPM auto-discovery

Even after the file was added to the App target's Compile Sources,
`Capacitor.isPluginAvailable("AppleVisionOcr")` returned `false`. Capacitor
8's SPM mode only auto-discovers plugins enumerated in the generated
`Package.swift`; in-app plugins must be registered manually against the
bridge.

Fix in `AppDelegate.swift`:

- After `didFinishLaunching`, asynchronously poll for the root
  `CAPBridgeViewController` (it's created lazily by the storyboard) and
  call `bridge.registerPluginInstance(AppleVisionOcrPlugin())` as soon as
  the bridge exists. Up to 30 retries at 50 ms intervals — completes well
  before any JS code first calls `getOcr()`.
- `OcrService.getOcr()` no longer caches its resolution, so even if the
  very first call lost the race, subsequent calls immediately switch to
  AppleVision once it registers.
- Diagnostic NSLogs added at every interesting boundary
  (`[AppDelegate] Registered ...`, `[AppleVisionOcr] plugin loaded by
  Capacitor bridge`, `[AppleVisionOcr] OK — N lines, langs=...`) so future
  regressions are obvious from Xcode console.

Result: on iPhone, OCR now runs entirely on-device through Apple Vision,
with `tesseract.js` retained only as a defensive fallback for
non-iOS / web / XR-browser runtimes.

---

## PR9 — Native-feel scrolling/zoom + 3-line clamp with expand toggle

### Native-feel polish
The web app inside the WKWebView still bounced like a webpage and could be
pinch-zoomed. Three-layer fix:

- `capacitor.config.ts`: `ios.scrollEnabled: false` disables the WKWebView
  rubber-band; `limitsNavigationsToAppBoundDomains: true` keeps any in-app
  navigation inside our origin.
- `index.html` viewport: `maximum-scale=1.0, minimum-scale=1.0,
  user-scalable=no` — no pinch zoom.
- `index.css`: `overscroll-behavior: none`, `-webkit-text-size-adjust: 100%`,
  `-webkit-tap-highlight-color: transparent`, `-webkit-touch-callout: none`,
  `touch-action: pan-y`. Plus `font-size: 16px` on inputs/textarea/select
  (iOS auto-zooms focus on smaller sizes even with user-scalable=no).

### 3-line clamp + expand
`QuoteCard.tsx` now caps long quotes at 3 lines and renders a "펼쳐보기" /
"접기" toggle when (and only when) the content actually overflows. Detection
uses an offscreen measurement copy of the same paragraph plus `ResizeObserver`,
so the affordance never appears for short quotes. Toggle animates with
`AnimatePresence`. All buttons get `type="button"` + `touch-action:
manipulation` for reliable WKWebView taps.

---

## PR10 — Internationalization (KO / EN / JA) + social share images

### i18n infrastructure
Added a minimal in-house i18n layer under `src/i18n/`:

- `config.ts` — supported languages (`ko`, `en`, `ja`), default, storage key,
  and a light browser-language detector used on first launch.
- `translations.ts` — a flat `Record<key, string>` dictionary per language,
  namespaced by feature (`nav.*`, `home.*`, `library.*`, `capture.*`,
  `signin.*`, `settings.*`, `book.*`, `quote.*`, `edit.*`, `share.*`).
- `LanguageProvider.tsx` — React context exposing `lang`, `setLanguage`, and
  `t(key, vars)`. Persists the chosen language to Capacitor Preferences
  (`@capacitor/preferences`) and mirrors it to `document.documentElement.lang`
  so CSS `:lang()` rules can swap font stacks.

No external i18n dependency — the dict is ~300 keys and interpolation is a
single regex pass, so a bundler-unfriendly library wasn't worth the weight.

### Font switching per language
`src/index.css` imports Noto Sans JP via `@fontsource`/google font import
alongside Pretendard and Inter, then uses `html:lang(...)` selectors to pick
the primary family per locale: Pretendard for Korean, Inter for English,
Noto Sans JP for Japanese. The rest of the Tailwind typography stack is
unchanged, so layout metrics stay stable.

### UI migration
Every user-facing string in the app now flows through `t()` — including
navigation (`BottomNav`), home (`Index` + `DailyQuote`), library (`Library`
+ `BookDetail` + `BookCover`), capture flow (`Capture`, `CaptureFromImage`,
`QuoteSelector`), quote card + action/edit sheets (`QuoteCard`,
`ActionSheet`, `EditQuoteSheet`, `useQuoteActions`), sign-in (`SignIn`) and
settings (`Settings`). `useEnsureCovers.retryMissingCovers` was refactored
to return structured `CoverRetryEntry[]` so the Settings diagnostic panel
can localize its output instead of returning pre-baked Korean strings.

### Language picker
`Settings.tsx` gained a "Language" section listing all supported locales
from `LANGUAGES`; tapping one immediately swaps UI strings and font
stacks, and the choice survives relaunches.

### Social share images
Added `src/features/share/`:

- `renderQuoteCard.ts` — pure Canvas 2D renderer. Waits on
  `document.fonts.load(...)` so the first share after a cold start isn't in
  a fallback font, greedy-wraps with per-glyph fallback for CJK, and
  auto-shrinks the body size until the text fits the safe area. Outputs
  PNG data URL + base64 for native handoff. Ships two sizes: **1080×1350**
  (feed post / 4:5) and **1080×1920** (story / 9:16).
- `shareImage.ts` — native path writes the PNG to `Directory.Cache` via
  `@capacitor/filesystem`, reads back a `file://` URI, and hands it to the
  `@capacitor/share` sheet (`Save Image`, Instagram, AirDrop, etc.). Web
  path prefers `navigator.share({ files })` when supported and falls back
  to a `<a download>` click.
- `components/ShareQuoteSheet.tsx` — bottom sheet with a size toggle,
  inline WYSIWYG preview, and a native share button. Rendering is
  token-guarded so late renders can't clobber fresh state.

Wired into `useQuoteActions`: long-pressing a quote now shows **Share as
image / Edit / Delete** in the action sheet, and the share sheet inherits
the quote's content, book title and author.

`@capacitor/share` was added to the iOS project via `npx cap sync`; no
Info.plist changes are required because the system share sheet handles its
own permissions.

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
