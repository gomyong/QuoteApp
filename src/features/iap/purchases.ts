import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";
import {
  revenueCatApiKey,
  isIapPreviewMode,
  tipProductIds,
} from "@/config/support";
import {
  isProPreviewMode,
  proEntitlementId,
  proMonthlyProductId,
  PRO_PRICE_LABEL_KRW,
} from "@/config/pro";
import { TIP_PREVIEW_TIERS } from "@/config/tipPreview";

/**
 * RevenueCat (StoreKit / Play Billing) service wrapper.
 *
 * - Tips: one-time consumables (no feature unlock)
 * - Pro: auto-renewable subscription → entitlement `pro`
 *
 * Everything here is guarded so it is a no-op on web/dev or when no API key
 * is configured for the current platform. The native plugin is dynamically
 * imported so it never enters the web bundle graph.
 */

export type TipProduct = {
  id: string;
  title: string;
  /** Localized price string from the store, e.g. "₩1,100" / "$0.99". */
  priceString: string;
  /** Raw numeric price, used only for sorting tiers. */
  price: number;
};

export type PurchaseOutcome =
  | { status: "success"; productId: string }
  | { status: "cancelled" }
  | { status: "error"; message: string };

const isNative = (): boolean => Capacitor.isNativePlatform();

/** Lazy plugin import — keeps RevenueCat out of the web bundle path. */
const loadPlugin = () => import("@revenuecat/purchases-capacitor");

let configurePromise: Promise<boolean> | null = null;

/**
 * Configure RevenueCat once per session. Idempotent and safe to await from
 * any entry point. Returns false when tips can't run (web/dev/no key), so
 * callers can fall back to a "coming soon" state.
 */
export const ensurePurchasesConfigured = async (): Promise<boolean> => {
  const apiKey = revenueCatApiKey();
  if (!isNative() || apiKey.length === 0) return false;
  if (!configurePromise) {
    configurePromise = (async () => {
      try {
        const { Purchases, LOG_LEVEL } = await loadPlugin();
        const { isConfigured } = await Purchases.isConfigured();
        if (!isConfigured) {
          let appUserID: string | undefined;
          try {
            const { data } = await supabase.auth.getUser();
            appUserID = data.user?.id ?? undefined;
          } catch {
            appUserID = undefined;
          }
          if (import.meta.env.DEV) {
            await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
          }
          await Purchases.configure({ apiKey, appUserID });
        }
        return true;
      } catch (e) {
        console.warn("[iap] configure failed:", e);
        configurePromise = null; // allow a later retry
        return false;
      }
    })();
  }
  return configurePromise;
};

/** Link the RevenueCat identity to a Supabase user id (optional). */
export const identifyPurchaseUser = async (userId: string): Promise<void> => {
  if (!(await ensurePurchasesConfigured())) return;
  try {
    const { Purchases } = await loadPlugin();
    await Purchases.logIn({ appUserID: userId });
  } catch (e) {
    console.warn("[iap] logIn failed:", e);
  }
};

/** Reset to an anonymous RevenueCat identity on sign-out (optional). */
export const resetPurchaseUser = async (): Promise<void> => {
  if (!isNative() || revenueCatApiKey().length === 0) return;
  try {
    const { Purchases } = await loadPlugin();
    const { isConfigured } = await Purchases.isConfigured();
    if (isConfigured) await Purchases.logOut();
  } catch (e) {
    console.warn("[iap] logOut failed:", e);
  }
};

/** Fetch the configured tip products, ordered by ascending price. */
export const getTipProducts = async (): Promise<TipProduct[]> => {
  if (isIapPreviewMode()) {
    return TIP_PREVIEW_TIERS.map((tier, i) => ({
      id: tier.productId,
      title: tier.title,
      priceString: tier.priceString,
      price: i + 1,
    }));
  }
  if (!(await ensurePurchasesConfigured())) return [];
  const { Purchases, PRODUCT_CATEGORY } = await loadPlugin();
  const { products } = await Purchases.getProducts({
    productIdentifiers: tipProductIds(),
    type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
  });
  return products
    .map((p) => ({
      id: p.identifier,
      title: p.title,
      priceString: p.priceString,
      price: p.price,
    }))
    .sort((a, b) => a.price - b.price);
};

const isUserCancelled = (err: unknown): boolean => {
  if (err && typeof err === "object") {
    const e = err as { userCancelled?: boolean; code?: string | number };
    if (e.userCancelled === true) return true;
    if (typeof e.code === "string" && e.code.toUpperCase().includes("CANCEL")) {
      return true;
    }
  }
  return false;
};

const errorMessage = (err: unknown): string => {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message?: unknown }).message ?? "purchase_failed");
  }
  return "purchase_failed";
};

/** Purchase a single consumable tip by product id. */
export const purchaseTip = async (productId: string): Promise<PurchaseOutcome> => {
  if (isIapPreviewMode()) {
    return { status: "success", productId };
  }
  if (!(await ensurePurchasesConfigured())) {
    return { status: "error", message: "not_available" };
  }
  try {
    const { Purchases, PRODUCT_CATEGORY } = await loadPlugin();
    const { products } = await Purchases.getProducts({
      productIdentifiers: [productId],
      type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    });
    const product = products[0];
    if (!product) return { status: "error", message: "product_not_found" };
    await Purchases.purchaseStoreProduct({ product });
    return { status: "success", productId };
  } catch (err) {
    if (isUserCancelled(err)) return { status: "cancelled" };
    console.warn("[iap] purchase failed:", err);
    return { status: "error", message: errorMessage(err) };
  }
};

// ---------------------------------------------------------------------------
// Quote Pro (subscription)
// ---------------------------------------------------------------------------

export type ProProduct = {
  id: string;
  title: string;
  priceString: string;
};

const PREVIEW_PRO_FLAG = "quote.pro.previewUnlocked";

export const isPreviewProUnlocked = (): boolean => {
  try {
    return localStorage.getItem(PREVIEW_PRO_FLAG) === "1";
  } catch {
    return false;
  }
};

export const setPreviewProUnlocked = (on: boolean): void => {
  try {
    if (on) localStorage.setItem(PREVIEW_PRO_FLAG, "1");
    else localStorage.removeItem(PREVIEW_PRO_FLAG);
  } catch {
    /* ignore */
  }
};

/** True when the `pro` entitlement is active (or preview mock unlock). */
export const getIsProActive = async (): Promise<boolean> => {
  // Dev/screenshot: mock subscribe sets localStorage; force via env for always-on.
  if (import.meta.env.VITE_PRO_FORCE_ACTIVE === "true") return true;
  if (isProPreviewMode() && isPreviewProUnlocked()) return true;
  if (!(await ensurePurchasesConfigured())) return false;
  try {
    const { Purchases } = await loadPlugin();
    const { customerInfo } = await Purchases.getCustomerInfo();
    const ent = customerInfo.entitlements.active[proEntitlementId()];
    return Boolean(ent);
  } catch (e) {
    console.warn("[iap] getCustomerInfo failed:", e);
    return false;
  }
};

export const getProProduct = async (): Promise<ProProduct | null> => {
  if (isProPreviewMode()) {
    return {
      id: proMonthlyProductId(),
      title: "Quote Pro",
      priceString: PRO_PRICE_LABEL_KRW,
    };
  }
  if (!(await ensurePurchasesConfigured())) return null;
  try {
    const { Purchases, PRODUCT_CATEGORY } = await loadPlugin();
    // Prefer current offering package tagged / matching product id.
    try {
      const { offerings } = await Purchases.getOfferings();
      const current = offerings.current;
      const pkgs = current?.availablePackages ?? [];
      const match =
        pkgs.find((p) => p.product.identifier === proMonthlyProductId()) ??
        pkgs.find((p) => p.identifier.toLowerCase().includes("pro")) ??
        pkgs[0];
      if (match?.product) {
        return {
          id: match.product.identifier,
          title: match.product.title,
          priceString: match.product.priceString,
        };
      }
    } catch {
      /* fall through to getProducts */
    }

    const { products } = await Purchases.getProducts({
      productIdentifiers: [proMonthlyProductId()],
      type: PRODUCT_CATEGORY.SUBSCRIPTION,
    });
    const p = products[0];
    if (!p) return null;
    return {
      id: p.identifier,
      title: p.title,
      priceString: p.priceString,
    };
  } catch (e) {
    console.warn("[iap] getProProduct failed:", e);
    return null;
  }
};

export const purchasePro = async (): Promise<PurchaseOutcome> => {
  const productId = proMonthlyProductId();
  if (isProPreviewMode()) {
    setPreviewProUnlocked(true);
    return { status: "success", productId };
  }
  if (!(await ensurePurchasesConfigured())) {
    return { status: "error", message: "not_available" };
  }
  try {
    const { Purchases, PRODUCT_CATEGORY } = await loadPlugin();
    const { products } = await Purchases.getProducts({
      productIdentifiers: [productId],
      type: PRODUCT_CATEGORY.SUBSCRIPTION,
    });
    const product = products[0];
    if (!product) return { status: "error", message: "product_not_found" };
    await Purchases.purchaseStoreProduct({ product });
    return { status: "success", productId };
  } catch (err) {
    if (isUserCancelled(err)) return { status: "cancelled" };
    console.warn("[iap] pro purchase failed:", err);
    return { status: "error", message: errorMessage(err) };
  }
};

export const restorePurchases = async (): Promise<{
  isPro: boolean;
  error?: string;
}> => {
  if (isProPreviewMode()) {
    setPreviewProUnlocked(true);
    return { isPro: true };
  }
  if (!(await ensurePurchasesConfigured())) {
    return { isPro: false, error: "not_available" };
  }
  try {
    const { Purchases } = await loadPlugin();
    const { customerInfo } = await Purchases.restorePurchases();
    const ent = customerInfo.entitlements.active[proEntitlementId()];
    return { isPro: Boolean(ent) };
  } catch (e) {
    console.warn("[iap] restore failed:", e);
    return { isPro: false, error: errorMessage(e) };
  }
};
