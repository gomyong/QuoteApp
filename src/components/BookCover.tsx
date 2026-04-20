import { useState } from "react";
import { BookOpen } from "lucide-react";

type Props = {
  coverUrl?: string | null;
  title: string;
  author?: string | null;
  /** Tailwind rounded-* class override. Default rounded-xl. */
  rounded?: string;
  /** Optional className passthrough on the outer wrapper. */
  className?: string;
};

// Deterministic pastel gradient from a title — keeps the placeholder stable
// so the same book always gets the same spine color.
const hashHue = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 360;
};

/**
 * Book cover with a graceful placeholder. Fills its parent; use with a
 * sized aspect-[2/3] container (the expected shape of a book spine).
 */
const BookCover = ({ coverUrl, title, author, rounded = "rounded-xl", className }: Props) => {
  const [failed, setFailed] = useState(false);
  const hasImage = !!coverUrl && !failed;

  const hue = hashHue(title || author || "quote");
  const initial = (title || author || "?").trim().charAt(0);

  return (
    <div
      className={
        "relative overflow-hidden border border-glass-border/30 shadow-[0_8px_22px_-10px_rgba(0,0,0,0.55)] " +
        rounded +
        (className ? " " + className : "")
      }
    >
      {hasImage ? (
        <img
          src={coverUrl ?? undefined}
          alt={`${title} 표지`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: `linear-gradient(145deg, hsl(${hue} 45% 28%) 0%, hsl(${(hue + 40) % 360} 35% 18%) 100%)`,
          }}
        >
          <div className="flex flex-col items-center gap-2 px-2 text-center">
            <BookOpen size={18} className="text-foreground/70" />
            <span className="text-foreground/90 text-xl font-display font-semibold leading-none">
              {initial.toUpperCase()}
            </span>
          </div>
          {/* Subtle spine highlight */}
          <div className="absolute inset-y-0 left-0 w-1.5 bg-black/25" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/5 via-transparent to-black/20" />
        </div>
      )}
    </div>
  );
};

export default BookCover;
