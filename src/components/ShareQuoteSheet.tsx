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
  Crown,
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
import { splitForShare } from "@/features/share/splitForShare";
import SentenceSelector from "@/components/SentenceSelector";
import { usePro } from "@/features/iap/ProProvider";
import ProSheet from "@/components/ProSheet";

type Props = {
  open: boolean;
  content: string;
  bookTitle?: string | null;
  author?: string | null;
  onClose: () => void;
};

const ShareQuoteSheet = ({ open, content, bookTitle, author, onClose }: Props) => {
  const { t, lang } = useTranslation();
  const { isPro } = usePro();
  const [selectedSize, setSelectedSize] = useState<ShareSize>(SHARE_SIZES[0]);
  const [image, setImage] = useState<RenderedImage | null>(null);
  const [rendering, setRendering] = useState(false);
  const [sharing, setSharing] = useState(false);
  /** Pro-only: omit watermark. Ignored when !isPro. */
  const [removeWatermark, setRemoveWatermark] = useState(true);
  const [proOpen, setProOpen] = useState(false);
  // Token guards against a slow render resolving after the sheet closes
  // (or a newer render has been requested) and clobbering fresh state.
  const renderToken = useRef(0);

  // Sentence-level selection — mirrors the OCR capture flow so long
  // quotes can be cherry-picked down to just the parts the user wants
  // on the shared image. Only surfaces when there's more than one
  // shareable unit; otherwise the sheet behaves identically to before.
  const sentences = useMemo(() => splitForShare(content), [content]);
  const multiSentence = sentences.length > 1;
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(sentences.map((_, i) => i)),
  );
  // Re-seed selection whenever the incoming quote (and therefore its
  // tokenization) changes — e.g. when the sheet is re-used for a
  // different card.
  useEffect(() => {
    setSelected(new Set(sentences.map((_, i) => i)));
  }, [sentences]);
  const toggleSentence = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  // What actually goes to the renderer. Single-sentence path returns
  // the original text verbatim (preserves any intentional whitespace
  // the user kept on the note); multi-sentence path joins the picked
  // pieces with a single space — the canvas wrapper will rewrap them
  // just fine.
  const effectiveContent = useMemo(() => {
    if (!multiSentence) return content;
    const picked = Array.from(selected)
      .sort((a, b) => a - b)
      .map((i) => sentences[i])
      .filter(Boolean);
    return picked.join(" ").trim();
  }, [multiSentence, content, selected, sentences]);

  // Re-render whenever the sheet opens, the effective content changes
  // (either the input quote itself or the user's sentence selection),
  // the user picks a different size, or the UI language flips.
  useEffect(() => {
    if (!open) {
      setImage(null);
      return;
    }
    if (!effectiveContent) {
      // Nothing selected — skip render, show empty state instead.
      setImage(null);
      setRendering(false);
      return;
    }
    const token = ++renderToken.current;
    setRendering(true);
    setImage(null);
    const showWatermark = !(isPro && removeWatermark);
    (async () => {
      try {
        const r = await renderQuoteCard({
          content: effectiveContent,
          bookTitle,
          author,
          lang,
          size: selectedSize,
          showWatermark,
        });
        if (renderToken.current !== token) return;
        setImage(r);
      } catch {
        /* leave image null — button stays disabled */
      } finally {
        if (renderToken.current === token) setRendering(false);
      }
    })();
  }, [
    open,
    effectiveContent,
    bookTitle,
    author,
    lang,
    selectedSize,
    isPro,
    removeWatermark,
  ]);

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

              {/* Sentence selector — only surfaced when there's more than
                  one shareable unit. Same tap-to-toggle / filled-circle
                  treatment as the OCR capture flow so the interaction
                  feels identical across the two places the user
                  composes a quote. */}
              {multiSentence && (
                <div className="mb-4 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t("share.select_sentences_hint")}
                  </p>
                  <SentenceSelector
                    sentences={sentences}
                    selected={selected}
                    onToggle={toggleSentence}
                    maxHeightClass="max-h-52"
                  />
                </div>
              )}

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

              {/* Watermark / Pro gate */}
              <div className="mb-4">
                {isPro ? (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={removeWatermark}
                    onClick={() => setRemoveWatermark((v) => !v)}
                    className="w-full flex items-center justify-between rounded-xl bg-glass-border/10 px-3 py-2.5"
                  >
                    <span className="text-xs text-foreground">
                      {t("share.watermark_off_pro")}
                    </span>
                    <span
                      className={`w-11 h-6 rounded-full relative transition-colors ${
                        removeWatermark ? "bg-accent" : "bg-glass-border/40"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-background transition-transform ${
                          removeWatermark ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setProOpen(true)}
                    className="w-full flex items-center gap-2 rounded-xl border border-dashed border-accent/40 bg-accent/5 px-3 py-2.5 text-left"
                  >
                    <Crown size={14} className="text-accent flex-none" />
                    <span className="text-xs text-foreground leading-snug flex-1">
                      {t("share.watermark_upsell")}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-medium flex-none">
                      Pro
                    </span>
                  </button>
                )}
              </div>

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
                  ) : !effectiveContent ? (
                    // Empty selection — nothing to preview. Tells the user
                    // why the button below is disabled.
                    <div className="text-muted-foreground text-xs px-4 text-center">
                      {t("share.sentences_none_selected")}
                    </div>
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
                disabled={!image || sharing || rendering || !effectiveContent}
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
  return (
    <>
      {createPortal(body, document.body)}
      <ProSheet open={proOpen} onClose={() => setProOpen(false)} />
    </>
  );
};

export default ShareQuoteSheet;
