# Quote

OCR로 책의 한 줄을 빠르게 기록하는 노트 앱.

- iOS / Android 네이티브 앱 (Capacitor)
- 웹 / PWA로도 동일하게 동작 (XR/AR 브라우저 호환 지향)
- 오프라인 우선, 로그인 시 Supabase 자동 동기화
- 코어 OCR: 네이티브에서는 Apple Vision / ML Kit, 웹에서는 Tesseract.js

## Tech

Vite · React · TypeScript · Tailwind · shadcn-ui · Capacitor · Supabase · IndexedDB(idb)

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in your VITE_SUPABASE_* values
npm run dev                  # http://localhost:8080
```

Apply the SQL migrations in `supabase/migrations/*.sql` on your Supabase project (SQL Editor or `supabase db push`).

## Build for phones

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full instructions. Short version:

```bash
npm run ios:add && npm run ios          # iOS (requires Xcode)
npm run android:add && npm run android  # Android (requires Android Studio)
```

## Project layout

```
src/
  features/
    auth/        Magic-link auth provider + sign-in page
    ocr/         OcrService interface + native (ML Kit) and web (Tesseract.js) impls
    capture/     CaptureFromImage workflow component
  sync/          IndexedDB schema, repo, sync engine, hooks
  pages/         Index / Capture / Library / Settings / SignIn / NotFound
  lib/supabase.ts
supabase/
  migrations/    SQL schema + policies
resources/       Master icon/splash sources for Capacitor assets
public/icons/    PWA icons
scripts/         Build helpers (e.g. iOS Info.plist patcher)
```
