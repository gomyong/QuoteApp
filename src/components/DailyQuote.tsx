import { motion } from "framer-motion";
import { Shuffle, Sparkles } from "lucide-react";
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

const DailyQuote = ({ content, bookTitle, author, onShuffle }: DailyQuoteProps) => {
  const { t } = useTranslation();
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

        <motion.p
          key={content}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-foreground text-lg leading-relaxed font-light whitespace-pre-wrap"
        >
          "{content}"
        </motion.p>

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
