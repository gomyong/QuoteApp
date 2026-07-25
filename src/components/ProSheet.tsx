import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Check, Crown, Loader2, Sparkles } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";
import { isProPreviewMode, PRO_PRICE_LABEL_KRW } from "@/config/pro";
import { usePro } from "@/features/iap/ProProvider";

type Props = {
  open: boolean;
  onClose: () => void;
};

const FEATURE_KEYS = [
  "pro.feature_watermark",
  "pro.feature_markdown",
  "pro.feature_obsidian",
  "pro.feature_notion",
] as const;

/**
 * Paywall / manage sheet for Quote Pro.
 * Free users see benefits + subscribe; Pro users see active state + restore.
 */
const ProSheet = ({ open, onClose }: Props) => {
  const { t } = useTranslation();
  const {
    isPro,
    product,
    purchasing,
    loadProduct,
    subscribe,
    restore,
  } = usePro();
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [purchaseError, setPurchaseError] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPurchaseError(false);
      setRestoreMsg(null);
      setLoadState("idle");
      return;
    }
    setLoadState("loading");
    void loadProduct()
      .then((p) => setLoadState(p ? "ready" : "error"))
      .catch(() => setLoadState("error"));
  }, [open, loadProduct]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const price = product?.priceString || PRO_PRICE_LABEL_KRW;

  const handleSubscribe = async () => {
    setPurchaseError(false);
    const res = await subscribe();
    if (res.status === "success") onClose();
    else if (res.status === "error") setPurchaseError(true);
  };

  const handleRestore = async () => {
    setRestoreMsg(null);
    const res = await restore();
    if (res.isPro) {
      setRestoreMsg(t("pro.restore_ok"));
      onClose();
    } else {
      setRestoreMsg(t("pro.restore_none"));
    }
  };

  const body = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-[95] bg-black/55 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t("pro.title")}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[96] max-h-[92dvh] flex flex-col bg-background rounded-t-3xl"
          >
            <div className="pt-3 flex justify-center flex-none">
              <div className="h-1.5 w-10 rounded-full bg-glass-border/60" />
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-6 pt-2 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Crown size={20} className="text-accent" />
                <h2 className="text-lg font-semibold text-foreground font-display">
                  {t("pro.title")}
                </h2>
                {isPro && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-medium">
                    {t("pro.badge_active")}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                {t("pro.subtitle")}
              </p>

              <ul className="space-y-3 mb-6">
                {FEATURE_KEYS.map((key) => (
                  <li key={key} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 flex-none">
                      <Check size={12} className="text-accent" />
                    </span>
                    <span className="text-sm text-foreground leading-snug">
                      {t(key)}
                    </span>
                  </li>
                ))}
              </ul>

              {isProPreviewMode() && (
                <p className="text-[11px] text-muted-foreground mb-3 italic">
                  {t("pro.preview_note")}
                </p>
              )}

              {purchaseError && (
                <p className="text-xs text-destructive mb-3">
                  {t("pro.purchase_error")}
                </p>
              )}
              {restoreMsg && (
                <p className="text-xs text-muted-foreground mb-3">{restoreMsg}</p>
              )}
            </div>

            <div className="flex-none px-5 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] border-t border-glass-border/20 space-y-2">
              {!isPro && (
                <button
                  type="button"
                  disabled={purchasing || loadState === "loading"}
                  onClick={() => void handleSubscribe()}
                  className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-medium bg-accent text-accent-foreground disabled:opacity-60"
                >
                  {purchasing || loadState === "loading" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  <span>
                    {t("pro.subscribe_cta", { price })}
                  </span>
                </button>
              )}
              <button
                type="button"
                disabled={purchasing}
                onClick={() => void handleRestore()}
                className="w-full text-xs py-2 text-muted-foreground hover:text-foreground"
              >
                {t("pro.restore")}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full text-sm py-2.5 rounded-xl bg-glass-border/10 text-foreground"
              >
                {t("common.close")}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(body, document.body);
};

export default ProSheet;
