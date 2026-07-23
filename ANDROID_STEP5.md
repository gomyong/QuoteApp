# Android Step 5 — Play Store first ship

> Status: **in progress** (2026-07-23)
> App id: `app.quote.note` · First Play version: **1.1.0** (versionCode 1)
> Companion: [`ROADMAP.md`](./ROADMAP.md) Step 5 · [`DEPLOYMENT.md`](./DEPLOYMENT.md)

## Done in repo

- [x] `npx cap add android` → `android/` scaffold
- [x] Camera / gallery permissions + `app.quote.note://auth/callback` intent
- [x] **MlKitOcr** in-app plugin (Latin + Korean) + JS routing
- [x] RevenueCat Android key wiring (`VITE_REVENUECAT_ANDROID_API_KEY`)
- [x] Gradle JDK → Android Studio JBR 21 (`android/gradle.properties`)

## Your checklist (console / device)

### A. One-time machine setup
- [ ] Android Studio open → SDK Platform 36 + build-tools installed
- [ ] Real Android device with USB debugging, or emulator with Google Play
- [ ] Shell tip (optional): `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`

### B. First run
```bash
npm run build
npx cap sync android
npm run android          # opens Android Studio
```
- [ ] Run on device → 기록 → 카메라/갤러리 → OCR (log: `MlKit` not Tesseract)
- [ ] 로그인 / 동기화 / 표지 스모크

### C. Upload keystore (keep offline — never commit)
```bash
keytool -genkey -v -keystore quote-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias quote
```
- [ ] Store `quote-upload.jks` + passwords in password manager
- [ ] Android Studio: **Build → Generate Signed App Bundle** → AAB

### D. Play Console
- [ ] Create app `Quote` · package `app.quote.note`
- [ ] Store listing (KR): short/full description, screenshots, feature graphic
- [ ] Privacy policy URL (see Tealdot.dev below — GitHub Pages OK until DNS live)
- [ ] Content rating questionnaire
- [ ] **Internal testing** track → upload AAB → add yourself as tester
- [ ] Data safety form (local OCR, Supabase auth/sync, optional tip IAP)

### E. RevenueCat + Play Billing
- [ ] Play Console → Monetize → create consumables (same IDs as iOS):
  - `app.quote.note.tip.small` / `.medium` / `.large`
- [ ] RevenueCat → add Android app → link Play service account
- [ ] Copy **public Android SDK key** (`goog_…`) into `.env.local`:
  ```
  VITE_REVENUECAT_ANDROID_API_KEY=goog_...
  ```
- [ ] Rebuild + sync → Settings → 개발자 응원하기 on a **license tester** account

### F. Soft launch → production
- [ ] Internal → closed/open testing → production
- [ ] Bump `versionCode` on every Play upload (keep `versionName` in sync with marketing)

---

## Tealdot.dev — company domain ↔ Quote product

**실행 가이드:** [`TEALDOT_DOMAIN.md`](./TEALDOT_DOMAIN.md) (DNS · GitHub Pages · Supabase · 스토어)

| 용도 | URL |
| --- | --- |
| 회사 / 테크 블로그 | `https://tealdot.dev` |
| Quote 랜딩 | `https://quote.tealdot.dev` |
| 개인정보처리방침 | `https://quote.tealdot.dev/privacy.html` |
| 지원/문의 | `https://quote.tealdot.dev/#contact` |
| Auth SMTP (설정 후) | `noreply@tealdot.dev` |

코드 반영 완료 — **DNS CNAME + GitHub Pages custom domain**만 하면 라이브.

---

## Commands cheat sheet

```bash
npm run build && npx cap sync android
npm run android

# After changing .env.local (RevenueCat Android key):
npm run build && npx cap sync android
```
