# Quote — 1.0 출시 + 외국어 표지 개선 실행 체크리스트

> 상태: **개발자 출시 대기 중** (심사 통과, 수동 릴리스 대기)
> 목표: **1.0 공개 출시 안정화 + EN/US·CA 표지 개선까지** 완료
> 최종 업데이트: **2026-07-18**
>
> 이 문서를 열어 두고 위에서부터 순서대로 체크하세요.
> 관련 상세: `ROADMAP.md` · `LAUNCH_CHECKLIST.md` · `IAP_STEP1_APPSTORE_DONATION.md`

---

## 진행 순서 한눈에

```
Phase A  출시 직전 콘솔/백엔드 점검  (오늘, 릴리스 전)
Phase B  1.0 공개 릴리스             (점검 후 바로)
Phase C  출시 직후 안정화            (릴리스 당일~1주)
Phase D  외국어 표지 개선 → 1.0.1    (다음 코드 작은업)
Phase E  (선택) iPad / iPhone only   (다음 버전 결정)
```

**원칙:** Phase A를 끝내고 Phase B(릴리스)를 누르세요.
표지 개선(Phase D)은 출시 **후** 다음 버전으로 올리면 됩니다.

> **2026-07-19 안정성 패치:** 로그아웃 로컬 wipe, outbox dead-letter, pull 페이지네이션,
> 이미지 업로드 순서, 표지 Abort 캐시, Capture 저장 에러 UI 등이 코드에 반영됨.
>
> **빌드 업로드 완료 (2026-07-19):** `1.0 (2)` → App Store Connect 업로드 성공 (처리 중).
> 아래 **B0** 단계를 끝낸 뒤 「이 버전 릴리스」를 누르세요.

---

# Phase A — 출시 직전 점검 (릴리스 버튼 누르기 전)

## A1. RevenueCat / IAP (실결제 기록에 필수)

- [x] RevenueCat 프로젝트에 iOS 앱(`app.quote.note`) 연결 확인 (2026-07-18)
- [x] **In-App Purchase Key (.p8)** 업로드 — Valid credentials (2026-07-18)
- [x] **App Store Connect API** (AuthKey + Key ID + Issuer ID + Vendor number) 연결 (2026-07-18)
- [x] RevenueCat Products에 3개 ID 등록 완료  
  ```
  `app.quote.note.tip.small` / `.medium` / `.large`
  ```
- [x] Products **"Could not check" 해소** — medium / large 정상  
  ```
  ⏳ small만 심사 중(In Review) → 승인 후 자동 반영
  ```
- [x] `app.quote.note.tip.small` Consumable 생성 → 단독 심사 제출 (2026-07-18)
- [ ] small IAP **심사 승인 확인** (릴리스와 병행 가능 — medium/large로 Sandbox 테스트 가능)
- [x] `.env.local`에 RevenueCat key + product IDs 확인 (빌드 반영됨)

## A2. Sandbox 후원 최종 확인 (실기기)

- [x] App Store Connect → Sandbox 테스터 계정 준비
- [x] 기기 설정 → App Store → Sandbox 계정 로그인
- [x] 앱 → 설정 → **개발자 응원하기** → 후원하기
- [x] 시트에 **실제 가격** 표시 확인 (medium / large — 2026-07-18)
- [x] **결제 성공** → 감사 화면 확인 (2026-07-18, Sandbox)
- [ ] **결제 취소** → 시트 유지, 오류 없음 확인 (선택, ~1분)
- [ ] (가능하면) 네트워크 끊고 **오류** 문구 확인 (선택)

> Sandbox가 안 되면 공개 릴리스 전에 원인을 먼저 잡는 편이 안전합니다.
> (키 미연결 / 상품 미매핑 / Sandbox 계정 문제)

## A3. Supabase (LAUNCH_CHECKLIST)

- [x] `0003_input_hardening.sql` 적용 확인 (`q_content_len` 등) — 2026-07-18
- [x] `0004_delete_own_account.sql` 적용 확인 — 2026-07-18
- [x] `0005_contact_inquiries.sql` 적용 확인 — 2026-07-18
- [x] Auth → URL Configuration → Additional Redirect URLs에  
  ```
  `app.quote.note://auth/callback` 추가 (OTP만 쓰면 선택, 매직링크 탭 복귀용)
  ```
- [x] (선택) Magic Link 이메일 템플릿 `{{ .Token }}` 확인
- [x] (선택) `supabase/README.md` Pre-launch 보안 체크리스트

## A4. 문서 불일치 정리 (DEPLOYMENT 등)

- [x] `LAUNCH_CHECKLIST.md` — IAP 포함 출시로 수정 (2026-07-18)
- [x] `DEPLOYMENT.md` — Donation IAP shipped in v1로 수정 (2026-07-18)
- [x] `ROADMAP.md` Baseline 갱신 (2026-07-18)

---

# Phase B — 1.0 공개 릴리스 (지금)

## B0. 안정성 패치 빌드 교체 (필수 — 옛 빌드 1로 릴리스하지 말 것)

- [x] 코드 패치 + `1.0 (2)` Archive + App Store Connect 업로드 (2026-07-19)
- [ ] Connect → **TestFlight / 활동** 에서 빌드 **2** 처리 완료(✓) 대기 (수 분~1시간)
- [ ] Quote → **iOS 앱 1.0** → 빌드 섹션에서 **빌드 2** 선택 (빌드 1이 붙어 있으면 교체)
- [ ] **심사용으로 제출** (Submit for Review) — 빌드가 바뀌면 재심사 필요
- [ ] 재승인 후 상태가 다시 **개발자 출시 대기**가 되면 B1으로

> Review Notes 예시: `Stability hotfix build 2: sign-out local wipe, sync dead-letter, pull pagination, cover abort cache. Tip IAP unchanged.`

## B1. App Store Connect

- [ ] App Store Connect → Quote → **1.0** 버전 상태 = **개발자 출시 대기 중** 확인 (**빌드 2**인지 확인)
- [ ] **이 버전 릴리스** (또는 Release This Version) 클릭
- [ ] 상태가 **판매 준비됨 / Ready for Sale** 또는 Processing으로 바뀌는지 확인  
  ```
  (스토어 반영까지 수 분~수 시간 걸릴 수 있음)
  ```
- [ ] App Store 공개 URL 복사해 두기  
  ```
  예: `https://apps.apple.com/app/idXXXXXXXX`  
  (App Store Connect → App Information / App Store 미리보기에서 확인)
  ```

## B2. 랜딩 페이지 반영

- [ ] `docs/index.html`의 「출시 알림」 CTA를 **실 App Store URL**로 교체
- [ ] GitHub Pages에 반영 (`docs/` push 또는 Pages 배포)
- [ ] 모바일에서 랜딩 → App Store 링크 열리는지 확인

---

# Phase C — 출시 직후 안정화 (당일 ~ 1주)

## C1. 실사용 스모크 테스트 (프로덕션 빌드 / TestFlight 또는 스토어)

- [ ] 매직링크 또는 OTP 로그인
- [ ] OCR 촬영 → 문장 저장
- [ ] 서재에서 표지 자동 매칭 (한글 책 1권 이상)
- [ ] (선택) 실계정 후원 — **실결제**는 소액만, 또는 Sandbox 유지
- [ ] 설정 → 계정 삭제 경로가 보이는지 확인 (실제 삭제는 테스트 계정만)

## C2. IAP_STEP1 잔여 (병행 가능, 1.0.1에 넣어도 됨)

- [ ] (선택) RevenueCat analytics: `view_tip_sheet`, `purchase_success/fail`
- [ ] (선택) RevenueCat `appUserID` ↔ Supabase user 로그인/로그아웃 시 연동

## C3. 모니터링

- [ ] App Store Connect → 평가/리뷰 / 크래시 리포트 확인
- [ ] RevenueCat 대시보드에 tip 이벤트 들어오는지 확인
- [ ] Supabase → `contact_inquiries`에 문의가 쌓이는지 확인

---

# Phase D — 외국어 표지 개선 → 1.0.1 (다음 코드 작업)

> 1.0이 스토어에 오른 뒤 바로 착수. 완료 후 1.0.1로 제출.

## D1. 베이스라인 (반나절)

- [ ] EN 도서 테스트 목록 20~30권 준비 (US/CA 포함)
- [ ] Settings → 표지 다시 찾기로 **현재 hit rate** 기록
- [ ] 실패 유형 메모: no result / wrong edition / low-res / no cover

## D2. 구현 (3~5일)

- [ ] locale-aware provider 순서  
  ```
  한글: Kakao → Naver → Google → Open Library  
  영어/라틴: Google(개선) → Open Library → …
  ```
- [ ] Google Books: `isbn:` 직조회, `langRestrict`, 커버 해상도 개선
- [ ] Open Library provider 추가 (`providers/openLibrary.ts`)
- [ ] Settings 표지 진단에 **provider 이름** 표시
- [ ] (권장) 책 상세에서 표지 수동 선택/업로드 fallback

## D3. 검증 & 배포

- [ ] EN 코퍼스 hit rate 재측정 (목표: **85%+**)
- [ ] `npm run build` + `npx cap sync ios`
- [ ] Xcode Archive → App Store Connect 업로드 (버전 **1.0.1**)
- [ ] 심사 제출 → 승인 후 릴리스

## D4. 1.0.1에 같이 넣어도 좋은 항목

- [ ] `0003` 적용 후 데이터 이상 없으면 `VALIDATE CONSTRAINT`
- [ ] C2의 RevenueCat `appUserID` ↔ Supabase 연동

---

# Phase E — (선택) 다음 버전 iPad 결정

지금 당장 막을 필요는 없습니다. **1.0.1 또는 1.1** 전에 하나만 결정하세요.

- [ ] 옵션 1: **iPhone + iPad 유지** — iPad 레이아웃/스크린샷을 점진 개선
- [ ] 옵션 2: **iPhone only** — App Store Connect에서 iPad 지원 축소  
  ```
  (기존 iPad 다운로드 사용자가 있으면 영향 검토 필요)
  ```
- [ ] 결정 내용을 `ROADMAP.md` / 다음 버전 노트에 한 줄로 기록

---

# 이번 구간에 넣지 않는 것 (나중 — ROADMAP 참고)

아래는 **1.0 출시 + 표지 개선 구간 밖**. 연말 로드맵에 이미 있음.


| 항목                 | 언제         |
| ------------------ | ---------- |
| 딥링크 / 유니버설 링크      | Step 3     |
| PWA 아이콘 PNG        | Step 4     |
| 음성(STT)            | Goal / 백로그 |
| 초장문 공유 멀티페이지       | 백로그        |
| Android Play Store | Step 5     |
| 웹에서 문장 열람 (Goal C) | 9월 목표      |
| AR 글래스 (Goal D)    | 연말 최종 골    |


---

## 오늘/이번 주 추천 실행 순서 (짧게)

1. **A1** RevenueCat `.p8` 확인
2. **A2** Sandbox 후원 성공/취소
3. **A3** Supabase `0003~0005` + redirect
4. **B1** 「이 버전 릴리스」 클릭
5. **B2** 랜딩 App Store 링크 교체
6. **C1** 스모크 테스트
7. 준비되면 **Phase D** 코드 작업 시작 (저와 함께)

Phase A가 끝나면 바로 릴리스해도 됩니다. Phase D는 “출시하고 나서” 하면 됩니다.