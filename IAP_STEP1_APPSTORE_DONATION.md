# App Store Launch — Step 1 (Donation IAP)

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
5. Suggested display names:
   - Support Tip S
   - Support Tip M
   - Support Tip L
6. Set price tiers (starter recommendation):
   - S: Tier 1
   - M: Tier 5
   - L: Tier 10

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

## 6) Next step (Step 2 preview)

Step 2 will implement:
- In-app "후원하기" UI
- Offering fetch + purchase flow
- Purchase success/fail UX
- Basic telemetry events (view_tip_sheet, purchase_success/fail)

