import { Capacitor } from "@capacitor/core";
import { isIapPreviewMode, revenueCatApiKey } from "@/config/support";

/**
 * Quote Pro — monthly subscription unlocks:
 *   - watermark-free share images
 *   - Markdown / Obsidian / Notion archive export
 *
 * Tips (consumables) stay separate and never grant Pro.
 */

export const PRO_ENABLED = true;

/** RevenueCat entitlement identifier (must match dashboard). */
export const DEFAULT_PRO_ENTITLEMENT_ID = "pro";

/** Store subscription product id (ASC + Play). */
export const DEFAULT_PRO_MONTHLY_PRODUCT_ID = "app.quote.note.pro.monthly";

/** Marketing price (store may localize). */
export const PRO_PRICE_LABEL_KRW = "₩3,300";

export const proEntitlementId = (): string =>
  (
    (import.meta.env.VITE_IAP_PRO_ENTITLEMENT_ID as string | undefined) ??
    DEFAULT_PRO_ENTITLEMENT_ID
  ).trim() || DEFAULT_PRO_ENTITLEMENT_ID;

export const proMonthlyProductId = (): string =>
  (
    (import.meta.env.VITE_IAP_PRO_PRODUCT_ID as string | undefined) ??
    DEFAULT_PRO_MONTHLY_PRODUCT_ID
  ).trim() || DEFAULT_PRO_MONTHLY_PRODUCT_ID;

/**
 * Force Pro unlocked for UX / screenshot QA without a live subscription.
 * Turn off before store release builds.
 */
export const isProPreviewMode = (): boolean =>
  import.meta.env.VITE_PRO_PREVIEW === "true" || isIapPreviewMode();

/** Native + RC key, or preview — enough to show the subscribe sheet. */
export const isProPurchaseAvailable = (): boolean =>
  isProPreviewMode() ||
  (Capacitor.isNativePlatform() && revenueCatApiKey().length > 0);

export const isProSheetEnabled = (): boolean =>
  PRO_ENABLED &&
  (isProPreviewMode() || Capacitor.isNativePlatform());
