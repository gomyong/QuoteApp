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
- `.env.local` contains:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

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

## 3) Android (Capacitor)

```bash
npm run android:add    # one-time: creates android/
npm run android        # build web, sync to native, open Android Studio
```

In Android Studio:

1. Wait for Gradle sync to finish.
2. Open `android/app/src/main/AndroidManifest.xml` and confirm camera permission is present:
   - `<uses-permission android:name="android.permission.CAMERA" />`
   - `<uses-feature android:name="android.hardware.camera" android:required="false" />`
3. Run on a real device.
4. For Play Store: **Build → Generate Signed App Bundle / APK → Android App Bundle** with your upload keystore.

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

## Donation IAP (App Store only) — deferred for v1

The shipping v1 app is **free with no in-app tip UI**. Optional donations
(RevenueCat + StoreKit) are planned later; see
`IAP_STEP1_APPSTORE_DONATION.md` when you are ready.

Do **not** mention tips/donations in App Store metadata until the purchase
flow ships.

## Common issues

- **Magic-link redirect goes nowhere on a phone**: whitelist
  `app.quote.note://auth/callback` in Supabase → Authentication → URL
  Configuration → Redirect URLs. OTP code entry in the app still works
  without this. See `LAUNCH_CHECKLIST.md`.
- **OCR is slow on the web first time**: `tesseract.js` downloads Korean+English language data on first run. After that it's cached.
- **iOS camera blocked**: confirm `NSCameraUsageDescription` is present in `ios/App/App/Info.plist` (run `npm run ios:patch`).
- **Storage upload fails with "row-level security"**: verify the bucket `quote-images` exists and the storage policies from `0001_init.sql` are applied.
- **Delete account fails**: apply `0004_delete_own_account.sql` in the SQL Editor.
