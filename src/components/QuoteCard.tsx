import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Heart } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface QuoteCardProps {
  content: string;
  bookTitle?: string;
  author?: string;
  thoughts?: string;
  isFavorite?: boolean;
  createdAt?: string;
  index?: number;
  onToggleFavorite?: () => void | Promise<void>;
}

const CLAMP_LINES = 3;

const QuoteCard = ({
  content,
  bookTitle,
  author,
  thoughts,
  isFavorite = false,
  index = 0,
  onToggleFavorite,
}: QuoteCardProps) => {
  const [liked, setLiked] = useState(isFavorite);
  useEffect(() => setLiked(isFavorite), [isFavorite]);

  const handleHeartClick = () => {
    setLiked((v) => !v);
    void onToggleFavorite?.();
  };

  // Detect whether the quote actually overflows 3 lines so we only show the
  // "펼쳐보기" affordance when it would do something useful.
  const measureRef = useRef<HTMLParagraphElement | null>(null);
  const [overflowed, setOverflowed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const check = () => {
      // measureRef points at a copy that is rendered with NO line clamp,
      // wrapped by an offscreen, position:absolute container so we can
      // compare its height to the clamped height threshold.
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      className="glass rounded-2xl p-5 group relative overflow-hidden"
    >
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-accent/5 to-transparent" />

      {/* Hidden measurement copy — same typography, no clamp, off-screen.
          Lets us compare actual line count against CLAMP_LINES without
          relying on the visible element's clamped scrollHeight. */}
      <p
        ref={measureRef}
        aria-hidden="true"
        className="text-foreground/90 text-base leading-relaxed font-light absolute -left-[9999px] top-0 w-full pointer-events-none"
      >
        "{content}"
      </p>

      <AnimatePresence initial={false} mode="wait">
        <motion.p
          key={expanded ? "expanded" : "clamped"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={
            "text-foreground/90 text-base leading-relaxed font-light relative z-10 whitespace-pre-wrap " +
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
          className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 active:scale-[0.98] transition-all relative z-10"
          style={{ touchAction: "manipulation" }}
        >
          {expanded ? (
            <>
              <ChevronUp size={14} />
              <span>접기</span>
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              <span>펼쳐보기</span>
            </>
          )}
        </button>
      )}

      {thoughts && (
        <p className="mt-3 text-muted-foreground text-sm italic relative z-10">
          {thoughts}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between relative z-10">
        <div className="flex flex-col gap-0.5">
          {bookTitle && (
            <span className="text-accent text-xs font-medium">{bookTitle}</span>
          )}
          {author && (
            <span className="text-muted-foreground text-xs">{author}</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleHeartClick}
          aria-label="즐겨찾기"
          className="p-1.5 rounded-full transition-all duration-300"
          style={{ touchAction: "manipulation" }}
        >
          <Heart
            size={16}
            className={
              liked
                ? "fill-accent text-accent scale-110"
                : "text-muted-foreground hover:text-accent"
            }
            style={{ transition: "all 0.3s ease" }}
          />
        </button>
      </div>
    </motion.div>
  );
};

export default QuoteCard;
