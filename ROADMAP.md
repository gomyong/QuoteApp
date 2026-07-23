# Quote — 제품 로드맵 (Product Roadmap)

> 최종 업데이트: **2026-07-23**
> 이 문서는 `WORK_LOG.md`(구현 이력), `LAUNCH_CHECKLIST.md`(출시 체크리스트),
> `IAP_STEP1_APPSTORE_DONATION.md`(후원 IAP), `ANDROID_STEP5.md`(Play 출시)를
> 하나로 묶어 **앞으로의 방향**을 정리한 살아있는 계획 문서입니다.
>
> **도메인:** 사업 메인 = **tealdot.dev** (틸닷) · 제품 = Quote (서비스명 ≠ 법인명 OK)
> **지금 진행:** [`ANDROID_STEP5.md`](./ANDROID_STEP5.md)

기본 원칙: **"실현 불가능/한계"를 먼저 말하지 않는다.** 각 항목마다
*가능한 구현 경로*를 먼저 찾고, 제약은 그 경로 안에서 관리한다.

---

## 0. 현재 상태 (Baseline)

- **플랫폼:** iOS(Capacitor) 운영 · **Android scaffold + ML Kit OCR** · 웹/PWA 코드 공유
- **코어:** 온디바이스 OCR(Apple Vision / ML Kit / Tesseract 폴백) → 문장 저장
- **동기화:** Supabase(Postgres/Auth/Storage) + 오프라인 우선(IndexedDB + outbox)
- **표지 매칭:** locale-aware — 한글: Kakao→Naver→Google→Open Library / 라틴: Google→Open Library→…
- **i18n:** 한국어 / 영어 / 일본어 UI 문자열 3종
- **후원:** RevenueCat + StoreKit consumable 3티어 (small/medium/large **전부 Approved**)
- **Supabase:** 0001~0005 적용 · Auth redirect · **브랜딩 이메일 템플릿** 적용
- **App Store 1.0:** **출시 완료** (2026-07-21) — https://apps.apple.com/kr/app/id6790071377
- **App Store 1.0.1:** **출시·운영 중** (2026-07-23)
- **Android / Play:** Step 5 진행 중 — 체크리스트 [`ANDROID_STEP5.md`](./ANDROID_STEP5.md)
- **도메인:** `tealdot.dev` · Quote 공개 URL **`quote.tealdot.dev`** — [`TEALDOT_DOMAIN.md`](./TEALDOT_DOMAIN.md)
  → 실행 체크리스트: [`RELEASE_NOW.md`](./RELEASE_NOW.md) (iOS 운영) · [`ANDROID_STEP5.md`](./ANDROID_STEP5.md)

---

## 로드맵 개요 (한눈에)

| 구간 | 단계 | 목표 | 예상 규모 |
| --- | --- | --- | --- |
| **출시** | Step 0 | 1.0 릴리스 + 운영 안정화 | ✅ 완료 |
| **단기** | Step 1 | 1.0.1 (리뷰 피드백 + IAP 연동) | ✅ 운영 중 |
| **단기** | Step 2 ⭐ | 외국어(EN/US·CA) 표지 API 개선 | 🔄 hit rate 측정 남음 |
| **중기** | Step 5 ⭐ | **Android 출시** | 🔄 진행 중 |
| **중기** | Step 3 | 인증·딥링크 UX (+ tealdot.dev) | 2~3일 |
| **중기** | Step 4 | PWA/웹 마감 | **1.1+ / 2.0으로 이연** |
| **장기 골** | Goal A | 일본어 정식 대응 | — |
| **장기 골** | Goal B | 유럽어(독/프/스/덴마크/핀란드…) 순차 대응 | — |
| **장기 골** | Goal C | 웹 연동 — 저장 문장 웹에서 확인 | — |
| **장기 골** | Goal D | **AR 글래스 대응 (반드시 도달할 최종 골)** | — |
| **장기 골** | Goal E | 일반 메모 + 이미지/영상 저장 확장 | — |

---

# Part 1 — 출시 & 근시일 (Step 0 ~ Step 5)

## Step 0 — 출시 직후 운영 ✅ (1.0)

**목표:** 1.0을 안정적으로 릴리스하고 문서·콘솔 상태를 실제와 일치시킨다.

- [x] 1.0 **Ready for Sale** 릴리스 (2026-07-21)
- [x] RevenueCat: IAP 3개 Approved (small 포함, 2026-07-22)
- [x] Supabase: 0003~0005 + Auth redirect + **이메일 템플릿**
- [x] 랜딩 App Store URL CTA
- [x] 초기 스모크 테스트 (로그인·OCR·저장)
- [ ] App Review / 크래시 / 문의 **지속 모니터링**

---

## Step 1 — 1.0.1 ✅ (운영 중)

**목표:** 초기 사용자 리뷰 피드백 + 표지/IAP 개선.

- [x] 리뷰 피드백 UX (저장 토스트, OTP 문구, 로그인 닫기, 책 상세 문장 추가, placeholder)
- [x] 홈 최근 기록 10개
- [x] IAP: RevenueCat `appUserID` ↔ Supabase user 연동
- [x] Archive + upload **1.0.1 (build 3)**
- [x] Connect → 심사 → 릴리스 · **운영 중** (2026-07-23)
- [ ] (후순위) `0003` → `VALIDATE CONSTRAINT`

---

## Step 2 ⭐ — 외국어(EN / US·CA) 표지 API 개선

**상태:** 1.0.1에 **핵심 구현 반영**. 출시 후 hit rate 측정·미세 튜닝 남음.

### 2-A. 베이스라인 측정 (1.0.1 출시 후)
- [ ] 테스트 코퍼스 30~50권 (영문 베스트셀러, 캐나다 출판, 부제/시리즈 변형 포함)
- [ ] Settings "표지 다시 찾기"로 hit rate 기록
- [ ] 실패 유형 분류: no result / wrong edition / low-res / no cover image

### 2-B. 로케일 인식 라우팅 ✅ (1.0.1)
- [x] 제목 스크립트(한글 vs 라틴)로 provider 순서 분기
- [x] `bookSearchService.ts` locale-aware routing

### 2-C. Google Books 개선 🔄
- [x] `langRestrict=en` (라틴 제목)
- [ ] `isbn:` 직조회 pass (ISBN 있으면 최우선)
- [ ] `country` / `printType` 파라미터 실험

### 2-D. Open Library provider ✅ (1.0.1)
- [x] `src/features/books/providers/openLibrary.ts`
- [x] ISBN / 제목·저자 검색 → cover

### 2-E. 수동 fallback UI (후순위)
- [ ] 책 상세/편집에서 **표지 직접 선택·업로드**

### 2-F. (선택) ISBN 바코드 스캔
- [ ] 표지 뒷면 ISBN 스캔 → 정확 매칭 (1.1+)

**완료 기준:** EN 코퍼스 hit rate **70% → 85%+**, 평균 커버 해상도 개선,
Settings 진단에 provider별 결과 표시.

**표지 소스 비교**

| 옵션 | 장점 | 단점 |
| --- | --- | --- |
| Google만 개선 | 구현 최소 | 북미 신간·독립서 여전히 약함 |
| **Google + Open Library** ✅ 1차 | 무료·ISBN 정확도↑·구현 부담 적음 | 일부 구ISBN/판본 누락 |
| + ISBNdb 등 유료 | 상용급 커버리지 | 비용·키 관리 |

---

## Step 3 — 인증·딥링크 UX (2~3일)

**목표:** 매직링크 탭 시 앱 복귀 안정화.

- [ ] `app.quote.note://auth/callback` + **Associated Domains** 유니버설 링크
- [ ] `DeepLinkHandler` / `AuthProvider` end-to-end 테스트
- [ ] 이메일 템플릿: 코드 + 링크 둘 다, 자릿수 고정 문구 제거

---

## Step 4 — PWA / 웹 마감 (**1.1+ / 2.0으로 이연**)

- [x] `public/icons/` PNG 준비됨 (로컬) — 스토어 릴리스 번들과 별도로 1.1+에 포함
- [ ] `manifest.webmanifest` 최종 점검 + 웹 배포
- [ ] 웹 표지 API 정리 (Naver CORS 한계 → 서버리스 proxy 또는 Google/Open Library only)
- [ ] tealdot.dev 하위 Quote 웹 origin 연결

---

## Step 5 — Android 출시 🔄 (진행 중 · 1.1.0)

**목표:** iOS에서 검증된 기능을 Play Store로 확장.
**실행 문서:** [`ANDROID_STEP5.md`](./ANDROID_STEP5.md)

- [x] `npm run android:add` → `android/` scaffold
- [x] ML Kit OCR 어댑터 (Latin + Korean) + JS 라우팅
- [x] 카메라/저장 권한 · auth deep link intent
- [x] RevenueCat Android API key 코드 경로
- [ ] keystore · AAB · Play Console 내부 테스트
- [ ] Play Billing 상품 + RevenueCat Android 앱 연동 · `.env.local` 키
- [ ] 내부 테스트 → 공개 테스트 → 출시
- [x] tealdot.dev 코드·문서 URL 통일 (`quote.tealdot.dev`) — DNS/GitHub Pages는 [`TEALDOT_DOMAIN.md`](./TEALDOT_DOMAIN.md)

---

# Part 2 — 장기 골 (Long-term Goals)

> 순서는 **의존성** 기준 추천이며, 언제든 재정렬 가능.
> 각 골은 "가능한 구현 경로"를 먼저 제시한다.

## Goal A — 일본어 정식 대응

**현황:** UI 문자열(`ja`)과 Noto Sans JP 폰트는 이미 존재. "정식 대응"은
UI 번역을 넘어 **OCR·표지·문장 품질**까지 일본어 기준을 맞추는 것.

**구현 경로**
1. **OCR:** Apple Vision `recognitionLanguages`에 `ja-JP` 추가
   (현재 `["ko-KR","en-US"]` 고정 → 앱 언어/자동감지 기반 동적 구성).
   세로쓰기(tategaki) 문서는 별도 후처리로 줄 병합 규칙 보정.
2. **표지:** 일본 도서 커버리지를 위해 provider 확장 검토
   — Google Books(일서 양호) + **openBD**(무료 일본 도서 DB, ISBN/커버) 추가.
3. **문장 분할:** `splitIntoSentences()`에 일본어 구두점(`。「」`) 규칙 추가.
4. **QA:** 일본어 도서 20권 코퍼스로 OCR·표지·분할 정확도 실측.

**완료 기준:** 일본어 UI + 일서 OCR/표지/문장분할이 한국어 수준으로 동작.

---

## Goal B — 유럽어 순차 대응 (독일어 → 프랑스어 → 스페인어 → 덴마크어 → 핀란드어 …)

**목표:** 라틴/확장 라틴 문자권을 한 언어씩 확장.

**구현 경로 (언어별 반복 가능한 템플릿)**
1. **UI:** `src/i18n/config.ts`의 `LANGUAGES`에 로케일 추가 + `translations.ts`에
   딕셔너리 한 벌 추가 (기존 구조가 flat record라 언어 추가 비용이 낮음).
2. **폰트:** 라틴 확장 글리프(움라우트 ä/ö/ü, ñ, å, ø 등)를 Inter가 대부분 커버.
   부족 시 Noto Sans 서브셋 추가.
3. **OCR:** Apple Vision은 라틴 계열 다국어를 광범위 지원 →
   `recognitionLanguages`에 해당 로케일 추가만으로 대응.
4. **표지:** Google Books `langRestrict` + Open Library(유럽 카탈로그 양호)로 대응.
5. **순차 릴리스:** 언어 하나씩 → 원어민/도구 검수 → 배포. (독→프→스→덴→핀)

**설계 포인트:** i18n·OCR·표지 3축을 **"언어 추가 = 설정 추가"** 수준으로
파라미터화해 두면 언어당 작업이 반복 가능한 체크리스트가 된다.

**완료 기준:** 신규 언어 추가 시 코드 구조 변경 없이 설정/딕셔너리 추가만으로 배포.

---

## Goal C — 웹 연동: 저장한 문장을 웹에서 확인

**목표:** 앱에서 저장한 문장을 브라우저(데스크톱 포함)에서 로그인 후 열람.

**구현 경로**
- 데이터는 이미 Supabase에 동기화되므로 **백엔드 신규 구축 불필요**.
- 같은 React 코드가 이미 웹/PWA로 빌드됨 → **웹 전용 읽기 뷰**를 우선 배포.
  1. **1단계(읽기 전용 웹):** `dist/`를 Vercel/Netlify/Cloudflare Pages/GitHub
     Pages에 배포 → 매직링크 로그인 → 내 서재/문장 열람·검색·공유 이미지 생성.
  2. **2단계(반응형 데스크톱 레이아웃):** 모바일 우선 UI를 wide 뷰포트용 그리드로 확장.
  3. **3단계(웹 편집/추가):** 웹에서 문장 추가·편집(동일 sync 엔진 재사용).
- **주의:** 웹 배포 시 Supabase Auth **Site URL / Redirect URL**에 웹 origin 추가,
  표지 API의 CORS(특히 Naver) 정리 필요 → Step 4와 연계.

**완료 기준:** PC 브라우저에서 로그인 → 저장 문장 열람/검색이 앱과 일관되게 동작.

---

## Goal D — AR 글래스 대응 (반드시 도달할 최종 골) ★

**목표:** "책을 보면 → 시선/제스처로 문장을 캡처 → 저장/열람"을 AR 글래스에서.

**단계적 구현 경로 (하드웨어 성숙도에 맞춰 진입)**

1. **Phase D0 — XR 브라우저/헤드셋 웹 (지금 가능):**
   - Apple Vision Pro는 iPad 앱을 그대로 실행 → 현재 Capacitor 빌드가 바로 동작.
   - Meta Quest / PCVR 브라우저는 동일 React PWA로 접근 (Goal C 웹 뷰 재사용).
   - 목표: 큰 공간형 화면에서 서재/문장을 편안히 읽는 "리더 모드".

2. **Phase D1 — 공간형 UI 최적화:**
   - 뷰포트/입력을 XR 친화적으로 (큰 타깃, 시선 포커스, 손 제스처 스크롤).
   - WebXR 지원 브라우저에서 몰입형 세션 진입 옵션.

3. **Phase D2 — 카메라 패스스루 캡처 (visionOS/Android XR 등):**
   - 글래스 카메라 프레임 → 온디바이스 OCR(기존 OCR 추상화 인터페이스 재사용)
     → 문장 후보 → 시선/제스처로 선택 → 저장.
   - OCR 서비스가 이미 "플랫폼별 구현 + 단일 인터페이스"라 **어댑터 하나 추가**로 확장.

4. **Phase D3 — 네이티브 XR 앱 (필요 시):**
   - 플랫폼이 웹/Capacitor로 부족하면 visionOS(SwiftUI/RealityKit) 또는
     Android XR 네이티브 뷰를 얇게 얹고, 데이터/OCR 코어는 공유.

**설계 포인트:** OCR·저장·동기화가 이미 인터페이스 뒤로 추상화되어 있어
"화면(프레젠테이션) 계층"만 XR용으로 갈아끼우면 됨 → 최종 골이지만 진입 비용이
단계적으로 낮음.

**완료 기준:** AR 글래스에서 카메라 캡처 → OCR → 문장 저장/열람이 손에 익는 UX로 동작.

---

## Goal E — 기능 확장: 일반 메모 + 이미지/영상 저장

**목표:** "책 문장"을 넘어 **일반 메모 · 사진 · 카메라 영상**까지 담는 노트로 확장.

**구현 경로**
1. **데이터 모델:** `quotes`를 일반화하거나 `notes` 유형 추가.
   - `type: 'quote' | 'memo' | 'image' | 'video'` 컬럼 도입(마이그레이션),
     기존 quote 레코드는 `type='quote'`로 자연 호환.
2. **저장소:** 이미지/영상은 Supabase Storage 버킷 활용
   (현재 `quote-images` 패턴 재사용 + `quote-media` 버킷 신설 검토).
   - 오프라인 우선 구조 유지: 로컬 저장 → outbox → 업로드.
3. **캡처:**
   - 사진: 기존 `@capacitor/camera` 재사용.
   - 영상: `@capacitor/camera`의 비디오 모드 또는 별도 미디어 플러그인 추가.
4. **UI:** 홈/서재에 메모·미디어 카드 타입 추가, 필터/검색 확장.
5. **용량/비용 관리:** 영상은 크기가 크므로 화질/길이 상한, 썸네일 생성,
   원본 보관 토글(현재 이미지 토글 패턴 확장)로 스토리지 비용 통제.

**완료 기준:** 문장·메모·이미지·영상을 한 서재에서 저장/열람/동기화.

---

# Part 3 — 추천 실행 순서 & 백로그

## 목표 기한: **2026년 연내 전체 달성**

| 기간 | 마일스톤 |
| --- | --- |
| **7월 말** | Step 0 완료 — 1.0 릴리스 |
| **8월 초** | Step 1 (1.0.1) ✅ 운영 · **Step 5 Android** 착수 |
| **8월** | Android 내부 테스트 → Play 출시 · tealdot.dev DNS/랜딩 이전 |
| **8월 말 ~ 9월** | Step 3 (딥링크 + tealdot.dev) · Step 2 hit-rate 튜닝 |
| **1.1+ / 2.0** | Step 4 PWA · Goal C 웹 열람 |
| **9~10월** | Goal A 일본어 … (이하 기존 계획) |

> 병행 팁: Goal B(유럽어)는 언어당 반복 작업이므로 다른 골 진행 중에도
> 한 언어씩 끼워 넣을 수 있다. Goal D Phase D0은 Goal C 웹 뷰가 나오는
> 9월부터 언제든 선행 검증 가능.

## 추천 순서 (의존성 기준)

```
[출시]  Step 0 → Step 1 (1.0.1) ✅
          │
[지금]  Step 5 (Android / Play) ⭐  +  tealdot.dev 이전 (병행)
          │
[다음]  Step 3 (딥링크) → Step 2 튜닝
          │
[이연]  Step 4 (PWA) / Goal C (웹) → 1.1+ / 2.0
          │
[장기]  Goal A → B → E → Goal D ★
```

- **Goal C(웹 열람)** 는 Step 4(PWA 마감) 위에 올리면 비용이 가장 낮다.
- **Goal D(AR)** 는 Goal C 웹 뷰를 그대로 XR에서 재사용하며 시작 → 최종 목표지만
  Phase D0은 사실상 지금도 진입 가능.
- **Goal A/B(다국어)** 는 서로 같은 i18n·OCR·표지 파라미터화를 공유하므로
  한 번 템플릿화하면 언어 추가가 반복 작업이 된다.

## 백로그 (우선순위 유동)

| 항목 | 출처 |
| --- | --- |
| 초장문 공유 이미지 멀티페이지 | WORK_LOG |
| 음성(STT) 입력 | WORK_LOG |
| RevenueCat analytics 이벤트 (`view_tip_sheet`, `purchase_*`) | IAP_STEP1 |
| Kakao/Naver 키 프로덕션 env 주입 (한국 hit rate↑) | PR-Launch |
| 태그/컬렉션 고도화, 전체 검색 | 신규 |

---

*이 문서는 계획용 살아있는 메모입니다. 완료 항목은 체크하고, 새 목표는 해당 파트에 추가하세요.*
