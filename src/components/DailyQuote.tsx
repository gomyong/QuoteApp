import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Shuffle, Sparkles } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "@/i18n/LanguageProvider";

interface DailyQuoteProps {
  content: string;
  bookTitle?: string;
  author?: string;
  /**
   * Called when the user taps the shuffle icon. Omit to hide the button
   * (e.g. when there's only the default welcome message to show).
   */
  onShuffle?: () => void;
}

// Match the visible clamp used by regular QuoteCards so the featured
// card and the recent-list feel consistent at a glance.
const CLAMP_LINES = 3;

const DailyQuote = ({ content, bookTitle, author, onShuffle }: DailyQuoteProps) => {
  const { t } = useTranslation();

  const [expanded, setExpanded] = useState(false);
  const [overflowed, setOverflowed] = useState(false);
  const measureRef = useRef<HTMLParagraphElement | null>(null);

  // Reset expansion whenever the content changes (e.g. the user shuffled).
  // Otherwise a short new quote would show an "접기" toggle that does nothing.
  useEffect(() => {
    setExpanded(false);
  }, [content]);

  // Measure an off-screen copy of the quote at the exact same typography
  // as the visible paragraph to decide whether the "펼쳐보기" affordance
  // is worth showing. Using scrollHeight on the clamped element is
  // unreliable because `-webkit-line-clamp` actively truncates it.
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const check = () => {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight || "0");
      if (!lineHeight) return;
      const lines = Math.round(el.scrollHeight / lineHeight);
      setOverflowed(lines > CLAMP_LINES);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [content]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative rounded-3xl overflow-hidden glow"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary via-card to-secondary" />
      <div className="absolute inset-0 bg-gradient-to-t from-accent/5 to-transparent" />

      <div className="relative p-7">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <span className="text-accent text-xs font-medium tracking-wider uppercase">
              {t("home.daily_title")}
            </span>
          </div>
          {onShuffle && (
            <button
              type="button"
              onClick={onShuffle}
              aria-label={t("home.shuffle")}
              className="p-1.5 rounded-full text-muted-foreground hover:text-accent hover:bg-glass-border/20 active:scale-95 transition-all"
              style={{ touchAction: "manipulation" }}
            >
              <Shuffle size={14} />
            </button>
          )}
        </div>

        {/* Hidden measurement copy — identical typography, no clamp. */}
        <p
          ref={measureRef}
          aria-hidden="true"
          className="text-foreground text-lg leading-relaxed font-light whitespace-pre-wrap absolute -left-[9999px] top-0 w-full pointer-events-none"
        >
          "{content}"
        </p>

        <AnimatePresence initial={false} mode="wait">
          <motion.p
            key={(expanded ? "e-" : "c-") + content}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={
              "text-foreground text-lg leading-relaxed font-light whitespace-pre-wrap " +
              (expanded ? "" : "line-clamp-3")
            }
          >
            "{content}"
          </motion.p>
        </AnimatePresence>

        {overflowed && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 active:scale-[0.98] transition-all"
            style={{ touchAction: "manipulation" }}
          >
            {expanded ? (
              <>
                <ChevronUp size={14} />
                <span>{t("quote.collapse")}</span>
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                <span>{t("quote.expand")}</span>
              </>
            )}
          </button>
        )}

        <div className="mt-6 flex items-center gap-2">
          <div className="w-6 h-px bg-accent/40" />
          <div>
            {bookTitle && (
              <span className="text-accent/80 text-xs">{bookTitle}</span>
            )}
            {author && (
              <span className="text-muted-foreground text-xs ml-2">
                {author}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DailyQuote;
