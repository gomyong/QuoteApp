import { useCallback, useEffect, useState } from "react";
import { isTipsAvailable } from "@/config/support";
import {
  getTipProducts,
  purchaseTip,
  type PurchaseOutcome,
  type TipProduct,
} from "./purchases";

export type TipLoadState =
  | "idle"
  | "loading"
  | "ready"
  | "unavailable"
  | "error";

/**
 * Loads tip products when `active` becomes true and exposes a purchase action.
 * Kept UI-agnostic so the TipSheet (or any future surface) can drive it.
 */
export const useTips = (active: boolean) => {
  const [products, setProducts] = useState<TipProduct[]>([]);
  const [loadState, setLoadState] = useState<TipLoadState>("idle");
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isTipsAvailable()) {
      setLoadState("unavailable");
      return;
    }
    setLoadState("loading");
    try {
      const items = await getTipProducts();
      setProducts(items);
      setLoadState(items.length > 0 ? "ready" : "error");
    } catch (e) {
      console.warn("[iap] load products failed:", e);
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    if (active && loadState === "idle") void load();
  }, [active, loadState, load]);

  const buy = useCallback(
    async (productId: string): Promise<PurchaseOutcome> => {
      setPurchasingId(productId);
      try {
        return await purchaseTip(productId);
      } finally {
        setPurchasingId(null);
      }
    },
    [],
  );

  return { products, loadState, purchasingId, buy, reload: load };
};
