# Quote — 출시 · 운영 실행 체크리스트

> 상태: **1.0 · 1.0.1 iOS 운영 중** · **quote.tealdot.dev 라이브** · **Android Step 5 준비 중**
> App Store: https://apps.apple.com/kr/app/id6790071377
> Quote 웹: https://quote.tealdot.dev
> 최종 업데이트: **2026-07-23**
>
> 관련: `ROADMAP.md` · `TEALDOT_DOMAIN.md` · `ANDROID_STEP5.md` · `LAUNCH_CHECKLIST.md`

---

## 진행 순서 한눈에

```
Phase A~B  1.0 출시                         ✅ (2026-07-21)
Phase F    1.0.1 심사 → 릴리스              ✅ (2026-07-23)
Phase G    Tealdot 도메인 (quote.tealdot.dev) ✅ (2026-07-23)
Phase H    Android scaffold (Step 5)         🔄 코드 완료 · Play 미제출
Phase C    출시 후 모니터링                  🔄
Phase I    SMTP (noreply@tealdot.dev)        ⏸ 다음에
```

---

# 릴리스 노트 정리

## 1.0.1 — App Store (출시 완료 · 2026-07-23)

**사용자-facing (스토어에 반영된 내용):**

```
· 문장 저장 시 확인 알림 추가
· 서재에서 해당 책에 바로 문장 추가
· 로그인 화면 개선 (닫기 버튼, 인증 코드 안내)
· 영어·외국어 도서 표지 자동 매칭 개선 (Open Library, locale 라우팅)
· 홈 최근 기록 10개까지 표시
· 안정성 및 후원(RevenueCat) 연동 개선
```

**빌드:** `1.0.1` (build 3) · 패키지 `app.quote.note`

---

## 2026-07-23 — 인프라 · 다음 버전 준비 (앱 스토어 미포함)

코드·문서·웹만 반영. **iOS 재제출 불필요.**

| 항목 | 상태 | 비고 |
| --- | --- | --- |
| **quote.tealdot.dev** | ✅ HTTPS 라이브 | Vercel DNS + GitHub Pages |
| 개인정보 / 지원 URL | ✅ | `publicUrls.ts`, `docs/privacy.html` |
| Supabase Site URL | ✅ | `https://quote.tealdot.dev` |
| 이메일 템플릿 (Tealdot 푸터) | ✅ | Dashboard 붙여넣기 완료 |
| **SMTP** `noreply@tealdot.dev` | ⏸ | Resend 등 — 다음에 |
| App Store Connect URL | ✅ | privacy / support 교체 |
| PWA 아이콘 PNG | 📦 레포만 | **1.1+ / 2.0**에 앱 번들 포함 예정 |
| Settings 표지 진단 UI | ✅ | API on/off + 성공/실패 요약 |
| **Android** Capacitor | 🔄 | `android/` · ML Kit OCR · RevenueCat Android 키 경로 |
| Play Store 제출 | ⏳ | keystore · AAB · Console — 다음 |

---

# Phase A~B — 1.0 출시 ✅

- [x] Ready for Sale (2026-07-21)
- [x] App Store URL · 랜딩 CTA

---

# Phase F — 1.0.1 iOS ✅

- [x] Archive + upload build 3 (2026-07-22)
- [x] Connect 심사 제출 → **승인 · 운영 중** (2026-07-23)
- [x] 릴리스 노트 (위 1.0.1 섹션)

### 1.0.1 코드 포함 항목 ✅

- [x] 리뷰 UX: 저장 토스트, OTP, 로그인 닫기, 책 상세 문장 추가
- [x] 홈 최근 10개
- [x] locale-aware 표지 + Open Library
- [x] RevenueCat `appUserID` ↔ Supabase

---

# Phase G — Tealdot.dev / Quote 웹 ✅

> 실행 가이드: [`TEALDOT_DOMAIN.md`](./TEALDOT_DOMAIN.md)

- [x] Vercel DNS: `quote` CNAME → `gomyong.github.io`
- [x] GitHub Pages custom domain + **Enforce HTTPS**
- [x] https://quote.tealdot.dev · privacy · 문의 폼
- [x] Supabase Auth Site URL + Tealdot 이메일 템플릿
- [x] App Store Connect privacy / support URL
- [ ] **SMTP** (Provider: Resend 등) — 스팸함·브랜드 발신용, **나중**
- [ ] `tealdot.dev` 루트 — 테크 블로그 (별도 Vercel 프로젝트)

**공개 URL (canonical):**

| 용도 | URL |
| --- | --- |
| Quote 랜딩 | https://quote.tealdot.dev |
| 개인정보 | https://quote.tealdot.dev/privacy.html |
| 지원 | https://quote.tealdot.dev/#contact |

---

# Phase H — Android Step 5 🔄

> 체크리스트: [`ANDROID_STEP5.md`](./ANDROID_STEP5.md)

### 레포에 완료 ✅

- [x] `npx cap add android` · `android/` scaffold
- [x] ML Kit OCR (한글+라틴) · `MlKitOcrPlugin`
- [x] 카메라/갤러리 권한 · auth deep link
- [x] RevenueCat Android API key 코드 (`VITE_REVENUECAT_ANDROID_API_KEY`)
- [x] debug APK 빌드 검증 (로컬)

### 다음 (Play 출시 전) ⏳

- [ ] Android Studio → **실기기 Run ▶** (OCR `MlKit` 로그 확인)
- [ ] upload keystore 생성 · Signed AAB
- [ ] Play Console 앱 생성 · 내부 테스트
- [ ] Play Billing 상품 + RevenueCat Android 연동
- [ ] Play privacy/support URL → quote.tealdot.dev

**첫 Play 버전:** `1.1.0` (versionCode 1) — iOS 1.0.1과 별도 트랙

---

# Phase C — 출시 후 모니터링 🔄

- [x] 1.0.1 로그인 · OCR · 저장 스모크 (2026-07-22~23)
- [ ] App Store 리뷰 · 크래시 주기 확인
- [ ] Supabase `contact_inquiries` 문의
- [ ] (선택) EN 표지 hit rate — Settings 표지 다시 찾기

---

# Phase D — 표지 후속 (1.0.1 이후)

- [ ] EN 코퍼스 20~30권 hit rate 측정 (목표 85%+)
- [ ] (후순위) ISBN 직조회 · 수동 표지 업로드

---

# Phase E — (선택) iPad

1.0.1 또는 1.1 전에 iPhone only vs iPad 유지 결정 — `ROADMAP.md` 참고

---

# 이번 구간에 넣지 않는 것

| 항목 | 시기 |
| --- | --- |
| SMTP / Resend | Phase I (원할 때) |
| PWA 설치형 마감 | 1.1+ / 2.0 |
| 딥링크 Associated Domains | Step 3 |
| 웹 문장 열람 (Goal C) | 1.1+ / 2.0 |
| AR (Goal D) | 연말 |

---

## 다음 추천 순서

1. **Android 실기기** — `npm run android` → Run ▶ → OCR/로그인 스모크
2. **Play Console** — 앱 생성 → 내부 테스트 AAB
3. **Phase C** — iOS 1.0.1 리뷰·크래시 모니터링
4. (여유 시) **SMTP** · EN 표지 hit rate
