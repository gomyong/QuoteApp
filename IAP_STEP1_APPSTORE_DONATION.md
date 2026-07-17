# App Store Launch — Donation IAP (후원하기)

> **Status (2026-07-17):** App code is **DONE and in the binary**. Business
> registration + Apple Paid Apps Agreement are complete, so we ship *with*
> the tip feature enabled. What remains is **account/console setup + keys +
> sandbox testing** — see [§7 오늘 저녁 할 일](#7-오늘-저녁-할-일-tonight-checklist).

Scope of this step:
- Store is App Store only.
- Base app remains free.
- Optional voluntary tip model only.
- No paywall, no feature lock.

Chosen direction:
- Billing stack: **RevenueCat + StoreKit**.
- Product shape: **3 consumable tip tiers** (small / medium / large).

---

## 1) Product IDs (fixed now)

Use these exact IDs in App Store Connect and RevenueCat:

- `app.quote.note.tip.small`
- `app.quote.note.tip.medium`
- `app.quote.note.tip.large`

Reason:
- Keeps naming stable across analytics, restore behavior, and support docs.
- Consumable type matches one-time "support/tip" behavior.

---

## 2) App Store Connect setup

In App Store Connect:

1. Open your app (`Quote`).
2. Go to **In-App Purchases** and create 3 products.
3. Product Type = **Consumable**.
4. Use the exact IDs above.
5. Suggested display names (Korean storefront):
   - 작은 응원 (small)
   - 든든한 응원 (medium)
   - 큰 응원 (large)
6. Set prices — **base storefront: South Korea (대한민국)**, then pick:
   - `app.quote.note.tip.small`  → **₩1,100** (VAT 포함, 체감 ~₩1,000)
   - `app.quote.note.tip.medium` → **₩3,300** (VAT 포함, 체감 ~₩3,000)
   - `app.quote.note.tip.large`  → **₩5,500** (VAT 포함, 체감 ~₩5,000)

   Apple’s Korean price list is VAT-inclusive; exact ₩1,000 / ₩3,000 / ₩5,000
   tiers are not offered — use the three amounts above instead.

Notes:
- Localized display names/descriptions should be added for Korean + English.
- Attach screenshot metadata for review.

---

## 3) RevenueCat setup

In RevenueCat:

1. Create project: `Quote-iOS`.
2. Add App (platform: iOS) with bundle id `app.quote.note`.
3. Connect App Store API key / app linkage.
4. Add products with the 3 IDs above.
5. Create an Offering:
   - Identifier: `default`
   - Packages:
     - `$rc_tier1` -> `app.quote.note.tip.small`
     - `$rc_tier2` -> `app.quote.note.tip.medium`
     - `$rc_tier3` -> `app.quote.note.tip.large`
6. Copy iOS Public SDK key.

Then in `.env.local`:

```bash
VITE_REVENUECAT_IOS_API_KEY=YOUR_REVENUECAT_IOS_PUBLIC_SDK_KEY
VITE_IAP_TIP_PRODUCT_IDS=app.quote.note.tip.small,app.quote.note.tip.medium,app.quote.note.tip.large
```

Rebuild after env update:

```bash
npm run build
npx cap sync ios
```

---

## 4) App Review-safe wording

Allowed pattern:
- "앱이 도움이 되었다면 자유롭게 후원해주세요."

Avoid:
- External payment links/buttons (web checkout, bank transfer, etc.) in app.
- "앱 내 결제 대신 외부에서 결제" 유도 문구.

---

## 5) Acceptance criteria for Step 1

- [ ] App Store Connect에 3개 Consumable IAP 생성
- [ ] RevenueCat default offering에서 3개 상품 매핑 완료
- [ ] `.env.local`에 RevenueCat key + product IDs 입력
- [ ] iOS build/sync 후 앱에서 후원 상품 조회 성공
- [ ] Sandbox 결제 성공 / 취소 / 오류 플로우 확인
- [ ] 앱 심사용 문구에 외부 결제 유도 없음

---

## 6) App code — IMPLEMENTED ✅

The in-app tip feature is fully built and passes `tsc` + `vite build`:

| File | Role |
| --- | --- |
| `src/config/support.ts` | Reads `VITE_REVENUECAT_IOS_API_KEY` + `VITE_IAP_TIP_PRODUCT_IDS`; `isTipsAvailable()` gate (native + key). |
| `src/features/iap/purchases.ts` | RevenueCat wrapper: lazy `configure`, `getTipProducts`, `purchaseTip`. Native-guarded; no-op on web/dev. |
| `src/features/iap/useTips.ts` | Loads products when the sheet opens; exposes `buy()`. |
| `src/components/TipSheet.tsx` | Bottom sheet: tier list → loading / ready / unavailable / error / thanks. |
| `src/pages/Settings.tsx` | "개발자 응원하기" card opens the sheet when `isTipsAvailable()`, else shows "준비 중". |
| `src/i18n/translations.ts` | `tip.*` strings (ko / en / ja). |

Behavior:
- **Consumables fetched by product ID directly** (`getProducts`, `NON_SUBSCRIPTION`),
  so a RevenueCat *Offering* is optional (nice for analytics, not required).
- On web / dev / missing key the card stays visible but shows "후원 준비 중이에요"
  — no crashes, no broken buttons.
- Purchase result: success → thank-you screen · cancel → silently stays open ·
  error → inline retry message.

**Not yet wired (optional, low priority):** analytics events
(`view_tip_sheet`, `purchase_success/fail`) and linking the RevenueCat
`appUserID` to the Supabase user on every sign-in/out (currently linked once,
lazily, at first sheet open). Neither blocks launch.

---

## 7) 오늘 저녁 할 일 (tonight checklist)

Everything below is **console/account work + testing** — no more app code needed
to go live.

### A. App Store Connect (~15 min)
- [ ] `Quote` 앱 → **In-App Purchases** → Consumable 3개 생성
      (`app.quote.note.tip.small` / `.medium` / `.large`, §1·§2 참고)
- [ ] 각 상품 가격 **₩1,100 / ₩3,300 / ₩5,500** (한국 VAT 포함, 기준: 대한민국)
- [ ] 한국어 + 영어 표시 이름/설명 입력, 심사용 스크린샷 첨부
- [ ] **Agreements** → Paid Apps 계약 "Active" 확인 (완료했다고 하셨으니 재확인만)
- [ ] **In-App Purchase Key** 발급 확인 (StoreKit 2 / RevenueCat용):
      Users and Access → Integrations → In-App Purchase → key 생성

### B. RevenueCat (~15 min)
- [ ] 프로젝트 `Quote-iOS` 생성, iOS 앱 추가 (bundle id `app.quote.note`)
- [ ] **App Store Connect API key** 연결 (server-to-server)
- [ ] Products 3개 등록 (위 ID) — 콘솔에서 Consumable로 인식되는지 확인
- [ ] (선택) `default` Offering 매핑 — 우리는 ID로 직접 조회하므로 필수 아님
- [ ] **iOS Public SDK key** 복사

### C. 키 주입 + 빌드 (~10 min)
- [ ] 프로젝트 루트 `.env.local` 에 입력:
      ```bash
      VITE_REVENUECAT_IOS_API_KEY=appl_XXXXXXXXXXXX
      VITE_IAP_TIP_PRODUCT_IDS=app.quote.note.tip.small,app.quote.note.tip.medium,app.quote.note.tip.large
      ```
- [ ] `npm install` (RevenueCat 네이티브 pod 반영 위해)
- [ ] `npm run build && npx cap sync ios`
- [ ] `npx cap open ios` → Xcode에서 실기기/시뮬레이터 실행

### D. Sandbox 결제 테스트 (~20 min)
- [ ] App Store Connect → **Sandbox 테스터** 계정 생성
- [ ] 기기 설정 → App Store → Sandbox 계정 로그인
- [ ] 설정 화면 → "개발자 응원하기" → "후원하기" → 시트에 **실제 가격** 표시 확인
- [ ] 결제 **성공** → 감사 화면 표시 확인
- [ ] 결제 **취소** → 시트 유지, 오류 없음 확인
- [ ] (가능하면) 네트워크 끊고 **오류** 문구 확인

### E. 심사 제출 전 최종
- [ ] IAP 3개가 "Ready to Submit" 상태 & 앱 버전에 첨부됨
- [ ] 앱 내 외부 결제 유도 문구/링크 없음 (§4)
- [ ] App Privacy 설문 갱신 (구매 관련 데이터: RevenueCat 사용 시 "Purchases" 항목)

> 막히는 지점(키 발급 화면, RevenueCat 상품 인식, 샌드박스 오류 등)이 있으면
> 그 화면/에러 그대로 알려주세요. 저녁에 바로 이어서 디버깅하겠습니다.

