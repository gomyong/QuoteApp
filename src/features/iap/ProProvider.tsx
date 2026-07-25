import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getIsProActive,
  getProProduct,
  purchasePro,
  restorePurchases,
  type ProProduct,
  type PurchaseOutcome,
} from "./purchases";

type ProContextValue = {
  isPro: boolean;
  loading: boolean;
  product: ProProduct | null;
  refreshing: boolean;
  purchasing: boolean;
  refresh: () => Promise<void>;
  loadProduct: () => Promise<ProProduct | null>;
  subscribe: () => Promise<PurchaseOutcome>;
  restore: () => Promise<{ isPro: boolean; error?: string }>;
};

const ProContext = createContext<ProContextValue | null>(null);

export const ProProvider = ({ children }: { children: ReactNode }) => {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [product, setProduct] = useState<ProProduct | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setIsPro(await getIsProActive());
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadProduct = useCallback(async () => {
    const p = await getProProduct();
    setProduct(p);
    return p;
  }, []);

  const subscribe = useCallback(async () => {
    setPurchasing(true);
    try {
      const res = await purchasePro();
      if (res.status === "success") await refresh();
      return res;
    } finally {
      setPurchasing(false);
    }
  }, [refresh]);

  const restore = useCallback(async () => {
    setPurchasing(true);
    try {
      const res = await restorePurchases();
      await refresh();
      return res;
    } finally {
      setPurchasing(false);
    }
  }, [refresh]);

  const value = useMemo(
    () => ({
      isPro,
      loading,
      product,
      refreshing,
      purchasing,
      refresh,
      loadProduct,
      subscribe,
      restore,
    }),
    [
      isPro,
      loading,
      product,
      refreshing,
      purchasing,
      refresh,
      loadProduct,
      subscribe,
      restore,
    ],
  );

  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
};

export const usePro = (): ProContextValue => {
  const ctx = useContext(ProContext);
  if (!ctx) {
    throw new Error("usePro must be used within ProProvider");
  }
  return ctx;
};
