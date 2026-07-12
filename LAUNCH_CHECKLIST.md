# Launch checklist (minimal user steps)

Most launch blockers are fixed in code. You only need to do the
**Dashboard / App Store Connect** items below once.

---

## Already done in the app (this PR)

- [x] In-app **Delete account** (Settings) + local data wipe
- [x] SQL migration `0004_delete_own_account.sql`
- [x] In-app **Privacy Policy** (`/#/privacy`) + public HTML in `docs/`
- [x] Support page HTML in `docs/support.html`
- [x] Docs: correct redirect URL `app.quote.note://auth/callback`
- [x] Bilingual camera/photo permission strings + export compliance flag
- [x] IAP/donation deferred for v1 (docs only — no in-app tip UI)

---

## You must do (≈15–20 minutes)

### A. Supabase SQL (required for account deletion)

1. Open [SQL Editor](https://supabase.com/dashboard/project/ugzwobdupgajmzkplvel/sql/new)
2. Paste **entire** contents of `supabase/migrations/0004_delete_own_account.sql` → **Run**
3. If not already applied, also run `0003_input_hardening.sql` the same way

### B. Supabase Auth redirect (magic-link return)

1. **Authentication → URL Configuration**
2. **Additional Redirect URLs**에 추가 후 Save:

```
app.quote.note://auth/callback
```

(OTP 숫자 입력 로그인은 이 설정 없이도 됩니다. 메일 **링크**를 눌러 돌아올 때만 필요합니다.)

### C. Magic Link email template (optional polish)

**Authentication → Email Templates → Magic Link**  
본문에 `{{ .Token }}` 이 있는지 확인하고, “6자리” 같은 고정 자릿수 문구는 지우세요.

### D. GitHub Pages (Privacy / Support URL for App Store Connect)

코드 푸시 후 Pages가 켜져 있으면 아래 URL을 씁니다:

| ASC 필드 | URL |
|----------|-----|
| **Privacy Policy URL** | https://gomyong.github.io/QuoteApp/privacy.html |
| **Support URL** | https://gomyong.github.io/QuoteApp/support.html |

Pages 설정 (한 번만):

1. GitHub → **QuoteApp** → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / folder: `/docs` → Save
4. 1–2분 뒤 위 URL이 열리는지 확인

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
```

---

## Redirect URL FAQ

**Q. OTP 자릿수 수정하면서 생긴 버그인가요?**  
**A. 아닙니다.** 예전 문서에 `login-callback`이라고 잘못 적혀 있었고, 앱 코드는 처음부터 `auth/callback`을 씁니다. 문서만 고쳤습니다.

**Q. 지금 당장 안 고치면?**  
숫자 코드 로그인은 그대로 됩니다. **메일 속 링크**로 앱에 돌아오는 경로만 실패할 수 있습니다.

---

## After checklist

```bash
npm run build
npx cap sync ios
# Xcode → Archive → TestFlight
```

Always build with `.env.local` present (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).
