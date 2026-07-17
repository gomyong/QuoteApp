/**
 * IAP 심사용 미리보기 — 텍스트만 여기서 수정하세요.
 *
 * `VITE_IAP_PREVIEW=true` 로 빌드하면 RevenueCat/StoreKit 없이도
 * 설정 → 후원하기 → 아래 금액 목록이 앱 안에 그대로 표시됩니다.
 * iPhone 시뮬레이터 또는 실기기에서 스크린샷 찍으면 App Store Connect
 * IAP 심사용 해상도에 맞습니다 (브라우저 캡처와 달리).
 *
 * ⚠️ App Store 출시 빌드 전에는 .env 에서 VITE_IAP_PREVIEW 를 끄거나 삭제하세요.
 */

export type TipPreviewTier = {
  /** App Store Connect Product ID — ASC 와 동일하게 유지 */
  productId: string;
  /** 목록에 보이는 이름 */
  title: string;
  /** 표시 가격 (StoreKit priceString 과 동일하게) */
  priceString: string;
};

/** 설정 화면 "개발자 응원하기" 카드 */
export const TIP_PREVIEW_SETTINGS = {
  title: "개발자 응원하기",
  description: "Quote는 혼자 만드는 앱이에요. 작은 응원이 큰 힘이 됩니다.",
  cta: "후원하기",
};

/** 후원 바텀시트 상단 */
export const TIP_PREVIEW_SHEET = {
  title: "개발자에게 커피 한 잔",
  subtitle: "앱이 도움이 되었다면 자유롭게 응원해 주세요.",
};

/** 후원 금액 3단 — ASC 가격(₩1,100 / ₩3,300 / ₩5,500) 과 맞춤 */
export const TIP_PREVIEW_TIERS: TipPreviewTier[] = [
  {
    productId: "app.quote.note.tip.small",
    title: "작은 응원",
    priceString: "₩1,100",
  },
  {
    productId: "app.quote.note.tip.medium",
    title: "든든한 응원",
    priceString: "₩3,300",
  },
  {
    productId: "app.quote.note.tip.large",
    title: "큰 응원",
    priceString: "₩5,500",
  },
];

/** 미리보기에서 구매 탭 시 감사 화면 문구 (실제 결제 없음) */
export const TIP_PREVIEW_THANKS = {
  title: "정말 고맙습니다",
  body: "보내주신 응원은 Quote를 계속 다듬는 데 큰 힘이 됩니다.",
};
