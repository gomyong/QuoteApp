# Quote — Build & Deployment

This guide covers the three distribution paths the app supports today, in order of difficulty:

1. Web / PWA (works on iOS Safari, Android Chrome, Apple Vision Pro Safari, Quest browser)
2. iOS via Capacitor (TestFlight → App Store)
3. Android via Capacitor (internal testing → Play Store)

## Prerequisites (one time)

- Node.js 18+ (already set up locally via Homebrew)
- For iOS: macOS, **Xcode 15+**, an Apple Developer account, CocoaPods (`sudo gem install cocoapods`)
- For Android: **Android Studio**, JDK 17+
- A Supabase project (already provisioned). SQL migrations applied:
  - `supabase/migrations/0001_init.sql`
  - `supabase/migrations/0002_add_is_favorite.sql`
  - `supabase/migrations/0003_input_hardening.sql`
  - `supabase/migrations/0004_delete_own_account.sql` (required for in-app account deletion)
  - `supabase/migrations/0005_contact_inquiries.sql` (landing contact form)
- `.env.local` contains:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_REVENUECAT_IOS_API_KEY` (iOS tip IAP — required for live tips)
  - `VITE_IAP_TIP_PRODUCT_IDS` (comma-separated consumable IDs; see `.env.example`)

## App icon & splash (one time)

1. Drop `resources/icon.png` (1024×1024) and `resources/splash.png` (2732×2732). See `resources/README.md`.
2. Generate platform assets:

```bash
npm run assets
```

3. (PWA) Also place `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`. See `public/icons/README.md`.

---

## 1) Web / PWA

```bash
npm run build
```

The `dist/` folder is a fully static site — deploy to Vercel, Netlify, Cloudflare Pages, GitHub Pages, etc.

After deploy:

- In Supabase → **Authentication → URL Configuration**, set the deployed URL as **Site URL** and add it to **Additional Redirect URLs** (so magic-link emails redirect back).
- iOS Safari users can install via **Share → Add to Home Screen**. Android Chrome shows an install prompt automatically.
- Apple Vision Pro / Meta Quest browsers can use the same URL.

## 2) iOS (Capacitor)

```bash
npm run ios:add        # one-time: creates ios/, patches Info.plist permissions
npm run ios            # build web, sync to native, open Xcode
```

In Xcode:

1. Select the `App` target → **Signing & Capabilities** → choose your **Team**.
2. Verify **Bundle Identifier** is `app.quote.note`.
3. Set a **Display Name** (`Quote`) and **Version**/**Build**.
4. Run on a connected iPhone (camera requires a real device — the simulator can only test "사진에서 선택").
5. For TestFlight: **Product → Archive → Distribute App → App Store Connect**.

If you regenerate `ios/` later, re-run `npm run ios:patch` to re-add the camera/photo permission strings to `Info.plist`.

## 3) Android (Capacitor) — Step 5

Full runbook: [`ANDROID_STEP5.md`](./ANDROID_STEP5.md)

```bash
# One-time (already done in repo — re-run only if android/ was deleted)
npm run android:add    # cap add android + manifest patch

# Everyday
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"  # JDK 17+
npm run android        # build web, sync, open Android Studio
```

In Android Studio:

1. Wait for Gradle sync.
2. Run on a **real device** (camera + ML Kit).
3. Confirm logcat shows `MlKit` OCR (not only Tesseract).
4. For Play: **Build → Generate Signed App Bundle** with your upload keystore.

Native OCR: `android/.../MlKitOcrPlugin.java` (Latin + Korean). Tips: set
`VITE_REVENUECAT_ANDROID_API_KEY` in `.env.local` after RevenueCat Android app is linked.

---

## Updating after code changes

```bash
# Web only
npm run build

# iOS (after web change or plugin add)
npm run ios            # builds, syncs, opens Xcode → Run

# Android
npm run android
```

## Donation IAP (App Store only) — **shipped in v1**

The app is **free** with an optional voluntary tip in **Settings → 개발자 응원하기**
(RevenueCat + StoreKit **consumables**). No paywall, no feature lock.

Setup checklist: `IAP_STEP1_APPSTORE_DONATION.md` · release runbook: `RELEASE_NOW.md`

Build with `.env.local` keys present (see Prerequisites). After changing env:

```bash
npm run build
npx cap sync ios
```

**App Store metadata:** describe optional tips honestly; do **not** link to external
payment methods in the app (Apple Guideline 3.1.1).

## Common issues

- **Magic-link redirect goes nowhere on a phone**: whitelist
  `app.quote.note://auth/callback` in Supabase → Authentication → URL
  Configuration → Redirect URLs. OTP code entry in the app still works
  without this. See `LAUNCH_CHECKLIST.md`.
- **OCR is slow on the web first time**: `tesseract.js` downloads Korean+English language data on first run. After that it's cached.
- **iOS camera blocked**: confirm `NSCameraUsageDescription` is present in `ios/App/App/Info.plist` (run `npm run ios:patch`).
- **Storage upload fails with "row-level security"**: verify the bucket `quote-images` exists and the storage policies from `0001_init.sql` are applied.
- **Delete account fails**: apply `0004_delete_own_account.sql` in the SQL Editor.
