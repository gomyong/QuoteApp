import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";
import {
  revenueCatApiKey,
  isIapPreviewMode,
  tipProductIds,
} from "@/config/support";
import { TIP_PREVIEW_TIERS } from "@/config/tipPreview";

/**
 * RevenueCat (StoreKit / Play Billing) service wrapper for voluntary tips.
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
