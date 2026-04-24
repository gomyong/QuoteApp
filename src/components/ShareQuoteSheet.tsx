/**
 * Bottom sheet for turning a quote into a shareable image.
 *
 * Interaction model:
 *   - User picks 1080×1350 (post) or 1080×1920 (story).
 *   - We re-render the Canvas on every size change and preview the PNG
 *     inline (scaled down via CSS). The preview is the exact bytes we'll
 *     share, so WYSIWYG across platforms.
 *   - Tapping "Share" hands off to the native share sheet (iOS → Save to
 *     Photos, Instagram, etc.) or a web fallback.
 *
 * The canvas renderer is async (waits for webfonts), so we reflect a
 * busy state on format change and disable the share button until the
 * first successful render lands.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Image as ImageIcon,
  Info,
  Loader2,
  Share2,
  X,
} from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";
import {
  renderQuoteCard,
  SHARE_SIZES,
  type RenderedImage,
  type ShareSize,
} from "@/features/share/renderQuoteCard";
import { sharePng } from "@/features/share/shareImage";

type Props = {
  open: boolean;
  content: string;
  bookTitle?: string | null;
  author?: string | null;
  onClose: () => void;
};

const ShareQuoteSheet = ({ open, content, bookTitle, author, onClose }: Props) => {
  const { t, lang } = useTranslation();
  const [selectedSize, setSelectedSize] = useState<ShareSize>(SHARE_SIZES[0]);
  const [image, setImage] = useState<RenderedImage | null>(null);
  const [rendering, setRendering] = useState(false);
  const [sharing, setSharing] = useState(false);
  // Token guards against a slow render resolving after the sheet closes
  // (or a newer render has been requested) and clobbering fresh state.
  const renderToken = useRef(0);

  // Re-render whenever the sheet opens, the quote changes, the user
  // picks a different size, or the UI language flips (fonts change).
  useEffect(() => {
    if (!open) {
      setImage(null);
      return;
    }
    const token = ++renderToken.current;
    setRendering(true);
    setImage(null);
    (async () => {
      try {
        const r = await renderQuoteCard({
          content,
          bookTitle,
          author,
          lang,
          size: selectedSize,
        });
        if (renderToken.current !== token) return;
        setImage(r);
      } catch {
        /* leave image null — button stays disabled */
      } finally {
        if (renderToken.current === token) setRendering(false);
      }
    })();
  }, [open, content, bookTitle, author, lang, selectedSize]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleShare = async () => {
    if (!image || sharing) return;
    setSharing(true);
    try {
      await sharePng({
        base64: image.base64,
        dataUrl: image.dataUrl,
        fileName: "quote",
        title: t("share.title"),
      });
    } catch {
      /* swallow — the share sheet dismissal is the user feedback */
    } finally {
      setSharing(false);
    }
  };

  // Preview height caps so the tall story format still fits on small screens.
  // Aspect ratio follows the *rendered* image when available (the renderer
  // may auto-promote a too-long Post → Story, so the visible bytes and the
  // preview frame should agree).
  const previewStyle = useMemo<React.CSSProperties>(() => {
    const w = image?.width ?? selectedSize.width;
    const h = image?.height ?? selectedSize.height;
    return {
      aspectRatio: `${w} / ${h}`,
      // 60vh cap, narrower for portrait phone screens with on-screen keyboards etc.
      maxHeight: "min(60dvh, 520px)",
      width: "auto",
    };
  }, [selectedSize, image]);

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
            aria-label={t("share.title")}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[96] max-h-[92dvh] flex flex-col bg-background rounded-t-3xl"
          >
            <div className="pt-3 flex justify-center flex-none">
              <div className="h-1.5 w-10 rounded-full bg-glass-border/60" />
            </div>

            <div className="px-5 py-3 flex items-center justify-between flex-none">
              <h2 className="text-foreground text-lg font-semibold font-display">
                {t("share.title")}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("common.close")}
                className="p-2 rounded-full hover:bg-glass-border/20"
                style={{ touchAction: "manipulation" }}
              >
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
              {/* Size selector */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {SHARE_SIZES.map((s) => {
                  const active = s.id === selectedSize.id;
                  const labelKey =
                    s.id === "post" ? "share.size_square" : "share.size_story";
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSize(s)}
                      className={`text-xs py-2.5 rounded-xl transition-colors ${
                        active
                          ? "bg-accent text-accent-foreground"
                          : "bg-glass-border/10 text-foreground hover:bg-glass-border/20"
                      }`}
                    >
                      {t(labelKey)}
                    </button>
                  );
                })}
              </div>

              {/* Overflow banners — surface to the user when the renderer
                  auto-promoted the size (Strategy B) or flagged the quote
                  as too long to fit even at the largest canvas + smallest
                  allowed font (Strategy C placeholder). */}
              {image && (image.wasPromoted || image.tooLong) && (
                <div className="mb-4 space-y-2">
                  {image.wasPromoted && (
                    <div className="flex items-start gap-2 rounded-xl bg-glass-border/15 px-3 py-2.5">
                      <Info
                        size={14}
                        className="mt-0.5 text-muted-foreground flex-none"
                      />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t("share.promoted_notice")}
                      </p>
                    </div>
                  )}
                  {image.tooLong && (
                    <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5">
                      <AlertTriangle
                        size={14}
                        className="mt-0.5 text-amber-700 flex-none"
                      />
                      <p className="text-xs text-amber-800 leading-relaxed">
                        {t("share.too_long_warning")}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Preview */}
              <div className="flex items-center justify-center">
                <div
                  className="rounded-xl overflow-hidden border border-glass-border/30 bg-[#F4F3F1] flex items-center justify-center"
                  style={previewStyle}
                >
                  {rendering && !image ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <Loader2 size={14} className="animate-spin" />
                      {t("share.generating")}
                    </div>
                  ) : image ? (
                    <img
                      src={image.dataUrl}
                      alt=""
                      className="w-full h-full object-contain select-none"
                      draggable={false}
                    />
                  ) : (
                    <ImageIcon size={24} className="text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-none px-5 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] border-t border-glass-border/20">
              <motion.button
                type="button"
                onClick={handleShare}
                disabled={!image || sharing || rendering}
                whileTap={{ scale: 0.97 }}
                className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-medium bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
                style={{ touchAction: "manipulation" }}
              >
                {sharing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Share2 size={16} />
                )}
                <span>{t("share.share")}</span>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(body, document.body);
};

export default ShareQuoteSheet;
