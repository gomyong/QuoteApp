# Launch checklist (minimal user steps)

Most launch blockers are fixed in code. You only need to do the
**Dashboard / App Store Connect** items below once.

---

## Already done in the app / site

- [x] In-app **Delete account** (Settings footer) + local data wipe
- [x] SQL migrations `0004_delete_own_account.sql`, `0005_contact_inquiries.sql`
- [x] In-app **Privacy Policy** (`/#/privacy`) + public HTML in `docs/`
- [x] Marketing landing at `docs/index.html` (GitHub Pages)
- [x] Contact form → Supabase `contact_inquiries` (no GitHub Issues)
- [x] Docs: correct redirect URL `app.quote.note://auth/callback`
- [x] Bilingual camera/photo permission strings + export compliance flag
- [x] IAP/donation deferred for v1 (docs only — no in-app tip UI)

---

## You must do (≈15–20 minutes)

### A. Supabase SQL (required)

1. Open [SQL Editor](https://supabase.com/dashboard/project/ugzwobdupgajmzkplvel/sql/new)
2. Run (if not already) `0003_input_hardening.sql`
3. Run `0004_delete_own_account.sql` (account deletion)
4. Run **`0005_contact_inquiries.sql`** (landing contact form)

문의 확인: Dashboard → **Table Editor** → `contact_inquiries`

### B. Supabase Auth redirect (magic-link return)

1. **Authentication → URL Configuration**
2. **Additional Redirect URLs**에 추가 후 Save:

```
app.quote.note://auth/callback
```

### C. Magic Link email template (optional polish)

**Authentication → Email Templates → Magic Link**  
본문에 `{{ .Token }}` 이 있는지 확인하고, “6자리” 같은 고정 자릿수 문구는 지우세요.

### D. App Store Connect URLs

| ASC 필드 | URL |
|----------|-----|
| **Privacy Policy URL** | https://gomyong.github.io/QuoteApp/privacy.html |
| **Support URL** | https://gomyong.github.io/QuoteApp/#contact |
| **Marketing URL** (선택) | https://gomyong.github.io/QuoteApp/ |
| **App Store** | ⏳ 사업자/계약 준비 중 — 랜딩은 **출시 알림** CTA로 배포 |

랜딩: https://gomyong.github.io/QuoteApp/

App Store 링크가 나오면 랜딩의 「출시 알림」 CTA를 App Store URL로 바꾸면 됩니다.

### E. App Store Connect (출시 메타)

1. **Privacy Policy URL** / **Support URL** — 위 D
2. **App Privacy** 설문 (대략):
   - Email Address — Yes (Account / App Functionality), Linked to user
   - User Content — Yes (App Functionality), Linked when signed in
   - Photos — Yes if users can sync originals (optional setting)
   - Tracking — **No**
3. **유료 앱 계약** — 후원 IAP를 **나중에** 넣을 예정이면 미리 Active 권장.  
   **v1에 후원 UI 없음** → IAP 상품 없이도 무료 앱 심사 가능
4. Review Notes 예시:

```
Sign-in: enter email → open inbox → type the numeric code from the email
(or tap the magic link). Camera is used for OCR. Offline works without login.
Account deletion: Settings → Delete account.
Support: https://gomyong.github.io/QuoteApp/#contact
```

5. App Store 링크가 나오면 랜딩의 `#download` / App Store 버튼을 실 URL로 교체

---

## After checklist

```bash
npm run build
npx cap sync ios
# Xcode → Archive → TestFlight
```

Always build with `.env.local` present (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).
