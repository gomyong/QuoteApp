# Tealdot.dev — domain setup for Quote

> **Company:** Tealdot (틸닷) — `https://tealdot.dev`  
> **Product:** Quote — `https://quote.tealdot.dev`  
> 서비스명(Quote)과 운영 주체(Tealdot)가 다른 것은 일반적입니다.

## URL map (canonical)

| 용도 | URL |
| --- | --- |
| 회사 / 테크 블로그 (향후) | `https://tealdot.dev` |
| Quote 랜딩 | `https://quote.tealdot.dev` |
| 개인정보처리방침 | `https://quote.tealdot.dev/privacy.html` |
| 지원 / 문의 | `https://quote.tealdot.dev/#contact` |
| Auth 메일 발신 (SMTP 설정 후) | `Quote <noreply@tealdot.dev>` |

코드 상수: `src/config/publicUrls.ts` · 정적 페이지: `docs/js/site-urls.js`

---

## 1. DNS (도메인 등록업체)

### Quote 랜딩 (지금 할 일)

GitHub Pages `docs/` 폴더 → **quote.tealdot.dev**

| Type | Name | Value |
| --- | --- | --- |
| **CNAME** | `quote` | `gomyong.github.io` |

`docs/CNAME` 파일에 `quote.tealdot.dev` 가 이미 있습니다.

### 회사 루트 (tealdot.dev — 블로그는 나중에)

테크 블로그를 같은 레포가 아닌 별도 호스팅(Vercel, Notion, Ghost 등)에 둘 계획이면:

- **A / CNAME** 은 그 호스팅 업체 안내에 따름
- 당장은 `tealdot.dev` → `https://quote.tealdot.dev` 로 **리다이렉트**만 걸어도 됨 (Cloudflare Page Rule, registrar redirect 등)

---

## 2. GitHub Pages

1. Repo **Settings → Pages**
2. Source: **Deploy from branch** → `main` → **`/docs`**
3. **Custom domain:** `quote.tealdot.dev` 입력 → Save
4. **Enforce HTTPS** 켜기 (인증서 발급 후)
5. DNS CNAME 전파 후 https://quote.tealdot.dev 열림 확인

이전 URL (`gomyong.github.io/QuoteApp/`)은 GitHub가 자동으로 커스텀 도메인으로 리다이렉트하지 않을 수 있음 → 스토어·앱 링크는 새 URL로 교체.

---

## 3. Supabase Dashboard

**Authentication → URL Configuration**

| 필드 | 값 |
| --- | --- |
| Site URL | `https://quote.tealdot.dev` |
| Additional Redirect URLs | `app.quote.note://auth/callback` (기존 유지) |
| | `http://localhost:8080/#/` (로컬 개발) |

**Authentication → Email Templates**  
`supabase/email-templates/*.html` 내용 다시 붙여넣기 (푸터 Tealdot 반영본).

**Authentication → Emails → SMTP** (선택, 스팸함 개선)

| 필드 | 값 |
| --- | --- |
| Sender email | `noreply@tealdot.dev` |
| Sender name | `Quote` |
| Provider | Resend / SendGrid / Postmark / SES 등 |

DNS에 SPF/DKIM 레코드 추가 (SMTP 업체 안내).

---

## 4. App Store Connect / Play Console

| 필드 | 새 URL |
| --- | --- |
| Privacy Policy | `https://quote.tealdot.dev/privacy.html` |
| Support URL | `https://quote.tealdot.dev/#contact` |
| Marketing URL (선택) | `https://quote.tealdot.dev/` |

앱 바이너리 재제출 없이 메타데이터만 수정 가능.

---

## 5. 체크리스트

```
□ DNS: quote → CNAME gomyong.github.io
□ GitHub Pages custom domain + HTTPS
□ quote.tealdot.dev 랜딩 / privacy / 문의 폼 동작
□ Supabase Site URL
□ (선택) SMTP noreply@tealdot.dev
□ ASC + Play 정책/지원 URL 업데이트
□ git push → Pages 재배포
```

---

## 6. tealdot.dev 블로그 (후속)

- Quote와 분리: `tealdot.dev` = 회사·블로그, `quote.tealdot.dev` = 제품
- 블로그 준비되면 랜딩 푸터의 Tealdot 링크만 `https://tealdot.dev` 로 연결 (이미 반영됨)
