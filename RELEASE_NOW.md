# Quote — 출시 · 운영 실행 체크리스트

> 상태: **iOS 1.0.1 운영 중** · **quote.tealdot.dev 라이브** · **Android AAB 준비 완료(로컬)** · **Quote Pro 코드 머지(main) · 스토어 미연결**
> App Store: https://apps.apple.com/kr/app/id6790071377
> Quote 웹: https://quote.tealdot.dev
> 최종 업데이트: **2026-07-26**
>
> 관련: `ROADMAP.md` · `TEALDOT_DOMAIN.md` · `ANDROID_STEP5.md` · `PRO_SUBSCRIPTION.md` · `LAUNCH_CHECKLIST.md`

---

## 버전 정책 (중요)

| 트랙 | 현재 스토어 / 목표 | 비고 |
| --- | --- | --- |
| **iOS** | **1.0.1** (build 3) · 운영 중 | 레포에 Pro 코드 있어도 **재제출 전까지 사용자에게 안 보임** |
| **Android** | 미출시 | 첫 Play **`1.1.0`** (versionCode 1) |
| **Quote Pro** | 코드만 (`main` `a17b990`) | ASC/Play 구독 + RC `pro` 연결 후 **1.1.x**로 함께 제출 예정 |

**원칙:** Git push ≠ 스토어 배포. 버전 bump · Archive/AAB · Console 제출은 **의도적 릴리스 때만**.

---

## 진행 순서 한눈에

```
Phase A~B  1.0 출시                         ✅ (2026-07-21)
Phase F    1.0.1 심사 → 릴리스              ✅ (2026-07-23)
Phase G    Tealdot 도메인 (quote.tealdot.dev) ✅ (2026-07-23)
Phase H    Android Step 5                     🔄 AAB·실기기 ✅ · Play Console ⏳
Phase J    Quote Pro (구독 1차)               🔄 코드 ✅ · 스토어 상품 ⏳
Phase C    출시 후 모니터링                  🔄
Phase K    언어 확장 (Goal A/B)               ⏸ Android·Pro 이후 · ROADMAP
Phase I    SMTP (noreply@tealdot.dev)        ⏸ 원할 때
Phase D/E  표지 EN / iPad                    ⏸ 후순위
```

---

## 향후 업무 전체 스킴 (2026-07-26)

### 우선순위 1 — Android Play 내부 테스트

> 상세: [`ANDROID_STEP5.md`](./ANDROID_STEP5.md)

| # | 업무 | 상태 | 산출물 |
| --- | --- | --- | --- |
| 1 | **D-U-N-S** 신청 (영문 사업자등록증명) | ⏳ | 9자리 번호 |
| 2 | Play Console **조직 계정** (Tealdot) + 사업자 인증 | ⏳ | 개발자 계정 |
| 3 | 앱 생성 · 스토어 등록정보 (KR 설명·스크린샷·아이콘) | ⏳ | Console 앱 |
| 4 | 개인정보 `quote.tealdot.dev/privacy.html` · 지원 URL | ⏳ | 정책 URL 입력 |
| 5 | 콘텐츠 등급 · 대상층 · **데이터 보안** 설문 | ⏳ | 출시 전 필수 |
| 6 | **내부 테스트** — `app-release.aab` 업로드 · 테스터 추가 | ⏳ | 설치 링크 |
| 7 | Play Billing **tip 3종** + RevenueCat Android 앱 연동 | ⏳ | `goog_…` 키 → `.env.local` |
| 8 | 실기기: 후원 · OCR · 로그인 · 동기화 재확인 | ⏳ | license tester |

**로컬 완료 (레포/맥 밖):** upload keystore `~/quote-upload.jks` · alias `quote` · Signed AAB

---

### 우선순위 2 — Quote Pro 스토어 연결 + 1.1 제출

> 상세: [`PRO_SUBSCRIPTION.md`](./PRO_SUBSCRIPTION.md)

| # | 업무 | 플랫폼 | 상태 |
| --- | --- | --- | --- |
| 1 | 구독 `app.quote.note.pro.monthly` (₩3,300) | iOS + Android | ⏳ |
| 2 | RevenueCat entitlement **`pro`** + Offering | RC Dashboard | ⏳ |
| 3 | 개인정보·데이터 안전에 **구독/결제** 명시 | Console | ⏳ |
| 4 | `VITE_PRO_PREVIEW` / `VITE_PRO_FORCE_ACTIVE` **끄기** | 빌드 | ⏳ |
| 5 | TestFlight(iOS) + Play 내부테스트에서 Pro QA | 실기기 | ⏳ |
| 6 | **iOS 1.1.0** (또는 1.2.0) Archive → App Store 제출 | iOS | ⏳ |

**Pro 1차 범위 (코드 ✅):** 워터마크 제거 · Markdown · Obsidian URI · Notion 내보내기  
**무료 유지:** 기록 · OCR · 동기화 · 워터마크 포함 공유 · 후원(tip)

---

### 우선순위 3 — 운영 · 품질 (병행 가능)

| Phase | 업무 | 상태 |
| --- | --- | --- |
| **C** | App Store 리뷰 · 크래시 · Supabase 문의 | 🔄 |
| **C** | Android 내부테스트 피드백 반영 | ⏳ Play 후 |
| **D** | EN 표지 hit rate 20~30권 (목표 85%+) | ⏸ |
| **G** | SMTP `noreply@tealdot.dev` (Resend 등) | ⏸ |
| **G** | `tealdot.dev` 루트 테크 블로그 | ⏸ |

---

### 우선순위 4 — 언어 확장 (Phase K · Goal A/B)

> 상세: [`ROADMAP.md`](./ROADMAP.md) Goal A / Goal B · 아래 **Phase K**

| 단계 | 범위 | 난이도 | 대략 공수 (1인 기준) |
| --- | --- | --- | --- |
| **K0** | OCR/표지/i18n **파라미터화** (언어 추가 = 설정) | 중 | **3~5일** |
| **K1 · Goal A** | 일본어 정식 — UI 재노출 + OCR `ja-JP` + openBD + 문장분할 | 중~높 | **1.5~3주** (세로쓰기 제외 시 짧음) |
| **K1a** | 세로쓰기(縦書き) **후처리 / 안내 UX** | 높 | **+1~2주** (별도 스파이크) |
| **K2 · Goal B** | 유럽어 1언어 (예: 독일어) 템플릿 검증 | 낮~중 | **3~7일 / 언어** |
| **K2+** | 프 · 스 · 덴 · 핀 순차 | 낮 (반복) | **언어당 2~5일** |

**언제:** Android 내부테스트 + Pro 1.1.x 제출 **이후**. Play/Pro와 **동시에 깊게 파지 말 것**.

**일본어 세로쓰기 정책 (권장):** 1차는 **가로쓰기(横書き) 중심**으로 “정식 대응”을 끝낸다. 세로쓰기·우측부터 읽는 판형은 OCR 줄 순서가 깨지기 쉬우므로, **감지 시 경고 + 수동 문장 선택/편집**으로 완화하고, 완벽한 자동 재정렬은 K1a에서.

---

### 후순위 / 이번 구간 제외

| 항목 | 시기 |
| --- | --- |
| Obsidian/Notion → Quote **가져오기** | Pro 2차 이후 검토 |
| PWA 설치형 · 웹 문장 열람 | 1.1+ / 2.0 |
| Associated Domains (유니버설 링크) | Step 3 |
| iPad 대응 결정 | Phase E |
| AR (Goal D) | 연말 |
| 일본어 세로쓰기 **완전 자동** 재정렬 | Phase K1a (스파이크 후 결정) |

---

### 추천 타임라인 (느슨한 순서)

```
[지금~]     D-U-N-S 신청 (병행) · Play Console 조직 계정
[Console]   내부 테스트 AAB · tip Billing · RC Android
[Console]   Pro 구독 상품 iOS+Android · RC pro entitlement
[릴리스]    iOS 1.1.x (Pro) TestFlight → App Store
[릴리스]    Android 1.1.0 내부 → 공개/프로덕션
[운영]      Phase C 모니터링 · SMTP·표지는 여유 시
[이후]      Phase K0 → K1 일본어(가로) → K2 유럽어 1개씩
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

## 레포만 반영 · 스토어 미포함

### 2026-07-23 — 인프라 · Android scaffold

| 항목 | 상태 | 비고 |
| --- | --- | --- |
| **quote.tealdot.dev** | ✅ HTTPS 라이브 | Vercel DNS + GitHub Pages |
| 개인정보 / 지원 URL | ✅ | `publicUrls.ts`, `docs/privacy.html` |
| Supabase Site URL + 이메일 템플릿 | ✅ | Tealdot 푸터 |
| App Store Connect URL | ✅ | privacy / support |
| Settings 표지 dev 노트 숨김 (prod) | ✅ | `e0371df` |
| Android Capacitor + ML Kit OCR | ✅ | `android/` |
| **SMTP** | ⏸ | Phase I |

### 2026-07-25 — Android 로컬 · Quote Pro

| 항목 | 상태 | 비고 |
| --- | --- | --- |
| Android 실기기 스모크 | ✅ | OCR · 로그인 · 동기화 |
| upload keystore + Signed AAB | ✅ | 로컬만 · git 제외 |
| **Quote Pro** (게이팅·내보내기·UX) | ✅ | `a17b990` · Preview env로 QA |
| Play Console / Pro 구독 상품 | ⏳ | Console 작업 대기 |

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

### 레포 + 로컬 완료 ✅

- [x] `npx cap add android` · `android/` scaffold
- [x] ML Kit OCR (한글+라틴) · `MlKitOcrPlugin`
- [x] 카메라/갤러리 권한 · auth deep link
- [x] RevenueCat Android API key 코드 경로
- [x] debug / release 빌드 검증
- [x] **실기기** Run ▶ — OCR · 로그인 · 동기화
- [x] upload keystore (`~/quote-upload.jks`) · **Signed AAB**

### Play Console (다음) ⏳

- [ ] D-U-N-S 발급
- [ ] **조직 계정** (Tealdot) · 사업자 인증
- [ ] 앱 생성 · 스토어 등록정보 · 스크린샷
- [ ] privacy / support → quote.tealdot.dev
- [ ] 콘텐츠 등급 · 데이터 보안
- [ ] **내부 테스트** AAB 업로드 · 테스터
- [ ] Play Billing tip 3종 + RC Android (`goog_…`)
- [ ] (Pro 출시 시) Android 구독 상품 + RC `pro`
- [ ] 내부 → closed/open → **프로덕션**

**첫 Play 버전:** `1.1.0` (versionCode 1)

---

# Phase J — Quote Pro (구독 1차) 🔄

> 스펙: [`PRO_SUBSCRIPTION.md`](./PRO_SUBSCRIPTION.md)

**유료 전용:** 워터마크 제거 · Markdown · Obsidian · Notion  
**무료 유지:** 기록 · OCR · 동기화 · 워터마크 포함 공유 · 후원(tip)

### 코드 ✅ (`a17b990`)

- [x] Pro entitlement 게이팅 · Settings / Share UX
- [x] Markdown / Obsidian URI / Notion export
- [x] 후원과 Pro 구분 UI

### 스토어 · 릴리스 ⏳

- [ ] ASC + Play 구독 `app.quote.note.pro.monthly` (₩3,300)
- [ ] RevenueCat entitlement `pro` + Offering
- [ ] Preview env 끄고 TestFlight / Play QA
- [ ] **iOS 1.1.x** (Pro 포함) App Store 제출

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

1.1 전에 iPhone only vs iPad 유지 결정 — `ROADMAP.md` 참고

---

# Phase I — SMTP ⏸

- [ ] Resend(등) · `noreply@tealdot.dev` · Supabase SMTP 설정

---

# Phase K — 언어 확장 (Goal A / B) ⏸

> 상세 구현 경로: [`ROADMAP.md`](./ROADMAP.md) Goal A · Goal B  
> **지금 앱:** Settings UI = **ko / en** (ja 문자열은 코드에 있으나 선택 숨김) · OCR = `ko-KR` + `en-US` 중심

### K0 — 기반 (한 번만)

- [ ] OCR `recognitionLanguages`를 앱 언어 / 감지 결과로 **동적 구성**
- [ ] 표지: locale → provider 순서를 설정 테이블화
- [ ] `splitIntoSentences` 구두점 세트 언어별 확장 (`。！？` 등)
- [ ] “언어 추가 체크리스트” 문서화 (UI · 폰트 · OCR · 표지 · QA)

### K1 — Goal A 일본어 정식 (가로쓰기 우선)

- [ ] Settings에 **日本語** 재노출 (번역 검수)
- [ ] Apple Vision / ML Kit에 `ja-JP` 추가
- [ ] 표지: openBD (또는 Google Books ja) 연동
- [ ] 문장 분할 일본어 규칙
- [ ] QA: 일본어 **가로쓰기** 도서 15~20권 코퍼스
- [ ] (정책) 세로쓰기 감지 시: 경고 배너 + 문장 선택/수동 편집 안내

### K1a — 세로쓰기 (縦書き) · 읽기 순서 (별도)

- [ ] 스파이크: Vision bounding box로 열(column) 방향 추정 가능한지
- [ ] 가능하면: 우측 열 → 좌측 열, 열 안 위→아래 재정렬
- [ ] 불가/불안정하면: “세로쓰기 페이지는 문장을 직접 골라 주세요” UX로 고정
- [ ] QA: 문고본 세로쓰기 10페이지 샘플

### K2 — Goal B 유럽어 순차

- [ ] 독일어 (템플릿 검증)
- [ ] 프랑스어 → 스페인어 → 덴마크어 → 핀란드어 (한 언어씩 배포)

---

## 다음에 할 일 (한 줄)

1. **D-U-N-S** → Play **조직 계정** → **내부 테스트 AAB**
2. **Pro** 구독 + RC → Preview 끄고 **iOS 1.1.x / Android 1.1.0** 제출
3. **Phase C** 모니터링 (병행)
4. (이후) **Phase K** — 일본어 가로쓰기 → 유럽어 순차 · 세로쓰기는 K1a
