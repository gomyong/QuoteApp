import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Check, Heart, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";
import { getTipTier, isIapPreviewMode } from "@/config/support";
import { TIP_PREVIEW_SHEET, TIP_PREVIEW_THANKS } from "@/config/tipPreview";
import { useTips } from "@/features/iap/useTips";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Voluntary "tip the developer" bottom sheet backed by RevenueCat consumables.
 *
 * States:
 *   - loading      → spinner while products fetch
 *   - ready        → list of tip tiers (localized store prices)
 *   - unavailable  → web/dev/no key: quiet "준비 중"
 *   - error        → fetch failed: retry
 *   - thanks       → post-purchase confirmation
 */
const TipSheet = ({ open, onClose }: Props) => {
  const { t } = useTranslation();
  const preview = isIapPreviewMode();
  const { products, loadState, purchasingId, buy, reload } = useTips(open);
  const [thanks, setThanks] = useState(false);
  const [purchaseError, setPurchaseError] = useState(false);

  useEffect(() => {
    if (!open) {
      setThanks(false);
      setPurchaseError(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleBuy = async (id: string) => {
    setPurchaseError(false);
    const res = await buy(id);
    if (res.status === "success") setThanks(true);
    else if (res.status === "error") setPurchaseError(true);
    // "cancelled" → stay silent, keep the sheet open.
  };

  const body = () => {
    if (thanks) {
      return (
        <div className="px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/15">
            <Check size={26} className="text-accent" />
          </div>
          <h3 className="text-lg font-semibold text-foreground font-display">
            {preview ? TIP_PREVIEW_THANKS.title : t("tip.thanks_title")}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {preview ? TIP_PREVIEW_THANKS.body : t("tip.thanks_body")}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground"
          >
            {t("common.close")}
          </button>
        </div>
      );
    }

    if (loadState === "loading" || loadState === "idle") {
      return (
        <div className="flex items-center justify-center py-14">
          <Loader2 size={22} className="animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (loadState === "unavailable") {
      return (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground">
          {t("tip.unavailable")}
        </div>
      );
    }

    if (loadState === "error") {
      return (
        <div className="px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">{t("tip.error")}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-4 rounded-full border border-glass-border/30 px-4 py-1.5 text-xs text-foreground"
          >
            {t("tip.retry")}
          </button>
        </div>
      );
    }

    return (
      <div className="px-4 pb-2">
        <div className="space-y-2">
          {products.map((p) => {
            const busy = purchasingId === p.id;
            const disabled = purchasingId !== null;
            const tier = getTipTier(p.id);
            const label =
              preview || !tier ? p.title : t(`tip.tier_${tier}`);
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => void handleBuy(p.id)}
                className="flex w-full items-center justify-between rounded-xl bg-glass-border/10 px-4 py-3.5 text-left transition-colors active:bg-glass-border/30 disabled:opacity-60"
                style={{ touchAction: "manipulation" }}
              >
                <span className="text-sm font-medium text-foreground">{label}</span>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  {p.priceString}
                </span>
              </button>
            );
          })}
        </div>
        {purchaseError && (
          <p className="mt-3 px-1 text-center text-xs text-destructive">
            {t("tip.purchase_error")}
          </p>
        )}
      </div>
    );
  };

  const content = (
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
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-[2px]"
            aria-hidden="true"
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t("settings.support_dev")}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
            className="fixed inset-x-0 bottom-0 z-[91] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]"
          >
            <div className="mx-auto max-w-lg">
              <div className="overflow-hidden rounded-2xl bg-card">
                <div className="px-5 pt-5 pb-3 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent/15">
                    <Heart size={20} className="text-accent" />
                  </div>
                  <h2 className="text-base font-semibold text-foreground font-display">
                    {preview ? TIP_PREVIEW_SHEET.title : t("tip.title")}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {preview ? TIP_PREVIEW_SHEET.subtitle : t("tip.subtitle")}
                  </p>
                </div>
                {body()}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-2 w-full rounded-2xl bg-card py-4 text-base font-semibold text-foreground active:bg-glass-border/30"
                style={{ touchAction: "manipulation" }}
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
  return createPortal(content, document.body);
};

export default TipSheet;
