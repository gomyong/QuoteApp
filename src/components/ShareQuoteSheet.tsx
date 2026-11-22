/**
 * Bottom sheet for turning a quote into a shareable image.
 *
 * Supports 1080×1350 (post) / 1080×1920 (story), 3 visual themes
 * (Paper, Midnight Navy, Dark Ink), Sans vs Serif typography,
 * optional user thoughts, and watermark toggle.
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
  PencilLine,
  RotateCcw,
  Share2,
  X,
} from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";
import {
  renderQuoteCard,
  SHARE_SIZES,
  type RenderedImage,
  type ShareFontStyle,
  type ShareSize,
  type ShareTheme,
} from "@/features/share/renderQuoteCard";
import { sharePng } from "@/features/share/shareImage";
import { splitForShare } from "@/features/share/splitForShare";
import SentenceSelector from "@/components/SentenceSelector";
import { usePro } from "@/features/iap/ProProvider";
import { PRO_ENABLED } from "@/config/pro";
import ProSheet from "@/components/ProSheet";

type Props = {
  open: boolean;
  content: string;
  bookTitle?: string | null;
  author?: string | null;
  thoughts?: string | null;
  page?: number | null;
  onClose: () => void;
};

const THEMES: Array<{ id: ShareTheme; labelKey: string }> = [
  { id: "paper", labelKey: "share.tpl_paper" },
  { id: "navy", labelKey: "share.tpl_navy" },
  { id: "dark", labelKey: "share.tpl_dark" },
];

const FONTS: Array<{ id: ShareFontStyle; labelKey: string }> = [
  { id: "sans", labelKey: "share.font_sans" },
  { id: "serif", labelKey: "share.font_serif" },
];

const ShareQuoteSheet = ({
  open,
  content,
  bookTitle,
  author,
  thoughts,
  page,
  onClose,
}: Props) => {
  const { t, lang } = useTranslation();
  const { isPro } = usePro();
  const [selectedSize, setSelectedSize] = useState<ShareSize>(SHARE_SIZES[0]);
  const [theme, setTheme] = useState<ShareTheme>("paper");
  const [fontStyle, setFontStyle] = useState<ShareFontStyle>("sans");
  const [includeThoughts, setIncludeThoughts] = useState(false);
  const [image, setImage] = useState<RenderedImage | null>(null);
  const [rendering, setRendering] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [removeWatermark, setRemoveWatermark] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const [editingLineBreaks, setEditingLineBreaks] = useState(false);
  const [customContent, setCustomContent] = useState<string | null>(null);
  const [debouncedCustomContent, setDebouncedCustomContent] = useState<string | null>(null);
  const canToggleWatermark = !PRO_ENABLED || isPro;
  const renderToken = useRef(0);

  const sentences = useMemo(() => splitForShare(content), [content]);
  const multiSentence = sentences.length > 1;
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(sentences.map((_, i) => i)),
  );
  useEffect(() => {
    setSelected(new Set(sentences.map((_, i) => i)));
  }, [sentences]);

  useEffect(() => {
    if (!open) {
      setEditingLineBreaks(false);
      setCustomContent(null);
      setDebouncedCustomContent(null);
    }
  }, [open, content]);

  useEffect(() => {
    if (customContent === null) {
      setDebouncedCustomContent(null);
      return;
    }
    const id = window.setTimeout(() => {
      setDebouncedCustomContent(customContent);
    }, 180);
    return () => window.clearTimeout(id);
  }, [customContent]);

  const toggleSentence = (i: number) => {
    setCustomContent(null);
    setDebouncedCustomContent(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const baseSelectedContent = useMemo(() => {
    if (!multiSentence) return content;
    const picked = Array.from(selected)
      .sort((a, b) => a - b)
      .map((i) => sentences[i])
      .filter(Boolean);
    return picked.join(" ").trim();
  }, [multiSentence, content, selected, sentences]);

  const effectiveContent = useMemo(() => {
    if (debouncedCustomContent !== null) return debouncedCustomContent.trim();
    return baseSelectedContent;
  }, [debouncedCustomContent, baseSelectedContent]);

  useEffect(() => {
    if (!open) {
      setImage(null);
      return;
    }
    if (!effectiveContent) {
      setImage(null);
      setRendering(false);
      return;
    }
    const token = ++renderToken.current;
    setRendering(true);
    setImage(null);
    const showWatermark = !(canToggleWatermark && removeWatermark);
    (async () => {
      try {
        const r = await renderQuoteCard({
          content: effectiveContent,
          bookTitle,
          author,
          thoughts,
          includeThoughts,
          page,
          lang,
          size: selectedSize,
          theme,
          fontStyle,
          showWatermark,
        });
        if (renderToken.current !== token) return;
        setImage(r);
      } catch {
        /* leave image null */
      } finally {
        if (renderToken.current === token) setRendering(false);
      }
    })();
  }, [
    open,
    effectiveContent,
    bookTitle,
    author,
    thoughts,
    includeThoughts,
    page,
    lang,
    selectedSize,
    theme,
    fontStyle,
    canToggleWatermark,
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
      /* ignore */
    } finally {
      setSharing(false);
    }
  };

  const previewStyle = useMemo<React.CSSProperties>(() => {
    const w = image?.width ?? selectedSize.width;
    const h = image?.height ?? selectedSize.height;
    return {
      aspectRatio: `${w} / ${h}`,
      maxHeight: "min(52dvh, 460px)",
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
              {/* Theme selector */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {THEMES.map((tpl) => {
                  const active = tpl.id === theme;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setTheme(tpl.id)}
                      className={`text-xs py-2 rounded-xl transition-colors ${
                        active
                          ? "bg-accent text-accent-foreground font-medium"
                          : "bg-glass-border/10 text-foreground hover:bg-glass-border/20"
                      }`}
                    >
                      {t(tpl.labelKey)}
                    </button>
                  );
                })}
              </div>

              {/* Size + Font selector row */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-glass-border/10 p-1">
                  {SHARE_SIZES.map((s) => {
                    const active = s.id === selectedSize.id;
                    const shortLabel = s.id === "post" ? "4:5" : "9:16";
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSize(s)}
                        className={`text-xs py-1.5 rounded-lg transition-colors ${
                          active
                            ? "bg-card text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {shortLabel}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-1 rounded-xl bg-glass-border/10 p-1">
                  {FONTS.map((f) => {
                    const active = f.id === fontStyle;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFontStyle(f.id)}
                        className={`text-xs py-1.5 rounded-lg transition-colors ${
                          f.id === "serif" ? "font-serif" : "font-sans"
                        } ${
                          active
                            ? "bg-card text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t(f.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {multiSentence && (
                <div className="mb-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t("share.select_sentences_hint")}
                  </p>
                  <SentenceSelector
                    sentences={sentences}
                    selected={selected}
                    onToggle={toggleSentence}
                    maxHeightClass="max-h-44"
                  />
                </div>
              )}

              {/* Manual line-break adjuster (preview-only, leaves saved note unchanged) */}
              <div className="mb-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLineBreaks((v) => {
                        const next = !v;
                        if (next && customContent === null) {
                          setCustomContent(baseSelectedContent);
                          setDebouncedCustomContent(baseSelectedContent);
                        }
                        return next;
                      });
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-colors ${
                      editingLineBreaks || customContent !== null
                        ? "bg-accent/15 text-accent font-medium"
                        : "bg-glass-border/10 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <PencilLine size={13} />
                    <span>{t("share.edit_linebreaks")}</span>
                  </button>
                  {customContent !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomContent(null);
                        setDebouncedCustomContent(null);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw size={12} />
                      <span>{t("share.reset_text")}</span>
                    </button>
                  )}
                </div>

                {editingLineBreaks && (
                  <div className="rounded-xl bg-glass-border/10 p-2.5 space-y-1.5">
                    <textarea
                      value={customContent ?? baseSelectedContent}
                      onChange={(e) => setCustomContent(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg bg-card/80 px-3 py-2 text-xs text-foreground leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <p className="text-[11px] text-muted-foreground px-0.5">
                      {t("share.edit_linebreaks_hint")}
                    </p>
                  </div>
                )}
              </div>

              {image && (image.wasPromoted || image.tooLong) && (
                <div className="mb-3 space-y-2">
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

              {/* Thoughts + Watermark toggles */}
              <div className="space-y-2 mb-4">
                {thoughts?.trim() && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={includeThoughts}
                    onClick={() => setIncludeThoughts((v) => !v)}
                    className="w-full flex items-center justify-between rounded-xl bg-glass-border/10 px-3 py-2.5"
                  >
                    <span className="text-xs text-foreground">
                      {t("share.include_thoughts")}
                    </span>
                    <span
                      className={`w-11 h-6 rounded-full relative transition-colors ${
                        includeThoughts ? "bg-accent" : "bg-glass-border/40"
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-0.5 w-5 h-5 rounded-full bg-background transition-transform ${
                          includeThoughts ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </span>
                  </button>
                )}

                {canToggleWatermark ? (
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
                        className={`absolute left-0 top-0.5 w-5 h-5 rounded-full bg-background transition-transform ${
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
                    <div className="flex items-center gap-2 text-muted-foreground text-xs px-4">
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
      {PRO_ENABLED && <ProSheet open={proOpen} onClose={() => setProOpen(false)} />}
    </>
  );
};

export default ShareQuoteSheet;
