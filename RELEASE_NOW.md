# Quote — 출시 · 1.0.1 심사 실행 체크리스트

> 상태: **1.0 출시 완료** · **1.0.1 (build 3) App Store Connect 업로드 · 심사 제출 대기**
> App Store: https://apps.apple.com/kr/app/id6790071377
> 최종 업데이트: **2026-07-22**
>
> 관련 상세: `ROADMAP.md` · `LAUNCH_CHECKLIST.md` · `IAP_STEP1_APPSTORE_DONATION.md`

---

## 진행 순서 한눈에

```
Phase A~B  1.0 출시                    ✅ 완료 (2026-07-21)
Phase C    출시 직후 운영              🔄 진행 중 (리뷰·모니터링)
Phase D    표지 개선 → 1.0.1           ✅ 코드 완료 · ⏳ 심사 대기
Phase F    1.0.1 Connect 제출          ⏳ 지금 할 일
Phase E    (선택) iPad 결정            나중
```

> **2026-07-22 1.0.1 (build 3):** 리뷰 피드백 UX + Open Library/locale 표지 + RevenueCat 연동.
> Archive + App Store Connect 업로드 완료. Connect에서 **1.0.1 버전 생성 → 빌드 3 첨부 → 심사 제출** 필요.

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
- [x] small IAP **심사 승인** — `app.quote.note.tip.small` Approved (2026-07-22)
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
- [x] (선택) Magic Link / Confirm signup **브랜딩 템플릿** 적용 (Supabase Dashboard, 2026-07-21)
- [x] (선택) `supabase/README.md` Pre-launch 보안 체크리스트

## A4. 문서 불일치 정리 (DEPLOYMENT 등)

- [x] `LAUNCH_CHECKLIST.md` — IAP 포함 출시로 수정 (2026-07-18)
- [x] `DEPLOYMENT.md` — Donation IAP shipped in v1로 수정 (2026-07-18)
- [x] `ROADMAP.md` Baseline 갱신 (2026-07-18)

---

# Phase B — 1.0 공개 릴리스 (지금)

## B0. 안정성 패치 빌드 교체 (필수 — 옛 빌드 1로 릴리스하지 말 것)

- [x] 코드 패치 + `1.0 (2)` Archive + App Store Connect 업로드 (2026-07-19)
- [x] Connect → **TestFlight / 활동** 에서 빌드 **2** 처리 완료(✓) 대기 (수 분~1시간)
- [x] Quote → **iOS 앱 1.0** → 빌드 섹션에서 **빌드 2** 선택 (빌드 1이 붙어 있으면 교체)
- [x] **심사용으로 제출** (Submit for Review) — 빌드가 바뀌면 재심사 필요
- [x] 재승인 후 **개발자 출시 대기** → 릴리스 완료 (2026-07-21)

## B1. App Store Connect — 1.0 ✅

- [x] Quote **1.0** → **배포 준비 됨 / Ready for Sale** (2026-07-21)
- [x] App Store 공개 URL: https://apps.apple.com/kr/app/id6790071377

## B2. 랜딩 페이지 ✅

- [x] `docs/index.html` CTA → App Store URL (2026-07-21)
- [x] GitHub Pages push
- [ ] (선택) 모바일에서 랜딩 → App Store 링크 재확인

---

# Phase C — 출시 직후 안정화 (당일 ~ 1주)

## C1. 실사용 스모크 테스트

- [x] 매직링크 또는 OTP 로그인 (2026-07-22)
- [x] OCR 촬영 → 문장 저장
- [x] 서재에서 표지 자동 매칭 (한글 책)
- [ ] (선택) 실계정 후원 — 소액 실결제
- [ ] 설정 → 계정 삭제 (테스트 계정만)

## C2. IAP / RevenueCat

- [x] RevenueCat `appUserID` ↔ Supabase user 연동 (1.0.1 코드, 2026-07-22)
- [ ] (선택) RevenueCat analytics: `view_tip_sheet`, `purchase_success/fail`

## C3. 모니터링

- [ ] App Store Connect → 평가/리뷰 / 크래시 리포트 주기 확인
- [ ] RevenueCat → tip 이벤트
- [ ] Supabase → `contact_inquiries` 문의

---

# Phase D — 외국어 표지 개선 → 1.0.1 ✅ (코드 완료)

> 1.0.1 (build 3)에 포함됨. 심사 통과 후 스토어 반영.

## D1. 베이스라인 (후속 — 1.0.1 출시 후)

- [ ] EN 도서 테스트 목록 20~30권 준비 (US/CA 포함)
- [ ] Settings → 표지 다시 찾기로 **hit rate** 기록
- [ ] 실패 유형 메모: no result / wrong edition / low-res / no cover

## D2. 구현 ✅

- [x] locale-aware provider 순서 (한글 vs 라틴 제목 스크립트)
- [x] Google Books: `langRestrict=en` (라틴 제목)
- [x] Open Library provider (`providers/openLibrary.ts`)
- [ ] (후순위) Settings 표지 진단에 provider 이름 표시
- [ ] (후순위) 책 상세 표지 수동 선택/업로드 fallback
- [ ] (후순위) Google `isbn:` 직조회 pass

## D3. 검증 & 배포

- [ ] EN 코퍼스 hit rate 재측정 (목표 **85%+**)
- [x] `npm run build` + Archive + App Store Connect 업로드 (**1.0.1 build 3**, 2026-07-22)
- [ ] Connect → **1.0.1** 버전 생성 → 빌드 3 첨부 → **심사 제출**
- [ ] 승인 후 릴리스

## D4. 1.0.1에 포함된 기타 항목 ✅

- [x] 홈 최근 기록 10개
- [x] 저장 토스트 · OTP 문구 · 로그인 닫기 · 책 상세 문장 추가
- [x] RevenueCat `appUserID` ↔ Supabase 연동
- [ ] (후순위) `0003` → `VALIDATE CONSTRAINT`

---

# Phase F — 1.0.1 App Store Connect (지금)

- [ ] TestFlight/활동 → 빌드 **3** 처리 완료(✓) 대기
- [ ] Quote → **+ 버전** → **1.0.1** 생성 (없으면)
- [ ] **이번 버전의 새로운 기능** (릴리스 노트) 작성
- [ ] 빌드 **3** 선택 → **심사용으로 제출**
- [ ] 승인 후 **릴리스** (자동/수동 선택)

**릴리스 노트 예시 (한국어):**
```
· 문장 저장 시 확인 알림 추가
· 서재에서 해당 책에 바로 문장 추가
· 로그인 화면 개선 (닫기 버튼, 인증 코드 안내)
· 영어 도서 표지 자동 매칭 개선
· 홈 최근 기록 10개까지 표시
· 안정성 및 후원 기능 개선
```

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

## 오늘/이번 주 추천 실행 순서

1. **Phase F** Connect → 1.0.1 → 빌드 3 → 심사 제출
2. **Phase C3** 리뷰·크래시·문의 모니터링
3. 1.0.1 승인 후 **Phase D1** EN 표지 hit rate 측정
4. 필요 시 **Phase E** iPad 전략 결정