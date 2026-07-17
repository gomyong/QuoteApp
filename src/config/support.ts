import { Capacitor } from "@capacitor/core";

/**
 * Developer support (voluntary tip) configuration.
 *
 * The app is free. Users can optionally leave a one-time "tip" to support
 * development. On iOS this MUST go through In-App Purchase (Apple Guideline
 * 3.1.1) — we use RevenueCat + StoreKit **consumables**. There are no external
 * payment links anywhere in the app.
 *
 * Runtime behavior of the "개발자 응원하기" card in Settings:
 *   - Native iOS + RevenueCat key present → live tip sheet (real IAP)
 *   - VITE_IAP_PREVIEW=true                  → mock UI for ASC screenshots
 *   - Otherwise on web/dev                   → quiet "준비 중"
 *
 * Keys come from env (see .env.example):
 *   VITE_REVENUECAT_IOS_API_KEY   RevenueCat public iOS SDK key (not a secret)
 *   VITE_IAP_TIP_PRODUCT_IDS      comma-separated consumable product IDs
 *   VITE_IAP_PREVIEW                "true" = mock tip UI (see tipPreview.ts)
 */

/** Master switch to show/hide the support card entirely. */
export const SUPPORT_ENABLED = true;

/**
 * Mock tip UI for App Store Connect IAP review screenshots.
 * Edit copy in `src/config/tipPreview.ts`. Turn off before App Store release.
 */
export const isIapPreviewMode = (): boolean =>
  import.meta.env.VITE_IAP_PREVIEW === "true";

/** RevenueCat public iOS SDK key (safe to ship in the client). */
export const REVENUECAT_IOS_API_KEY = (
  (import.meta.env.VITE_REVENUECAT_IOS_API_KEY as string | undefined) ?? ""
).trim();

const DEFAULT_TIP_PRODUCT_IDS = [
  "app.quote.note.tip.small",
  "app.quote.note.tip.medium",
  "app.quote.note.tip.large",
];

export type TipTier = "small" | "medium" | "large";

export const TIP_TIER_TARGET_KRW: Record<TipTier, number> = {
  small: 1_100,
  medium: 3_300,
  large: 5_500,
};

export const getTipTier = (productId: string): TipTier | null => {
  if (productId.endsWith(".small")) return "small";
  if (productId.endsWith(".medium")) return "medium";
  if (productId.endsWith(".large")) return "large";
  return null;
};

const ENV_TIP_PRODUCT_IDS: string[] = (
  (import.meta.env.VITE_IAP_TIP_PRODUCT_IDS as string | undefined) ?? ""
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const tipProductIds = (): string[] =>
  ENV_TIP_PRODUCT_IDS.length > 0 ? ENV_TIP_PRODUCT_IDS : DEFAULT_TIP_PRODUCT_IDS;

export const isTipsConfigured = (): boolean => REVENUECAT_IOS_API_KEY.length > 0;

/** Settings card shows an active "후원하기" button. */
export const isTipSheetEnabled = (): boolean =>
  isIapPreviewMode() || Capacitor.isNativePlatform();

/** Tip sheet can load products (preview mock or live StoreKit). */
export const isTipsAvailable = (): boolean =>
  isIapPreviewMode() || (Capacitor.isNativePlatform() && isTipsConfigured());
