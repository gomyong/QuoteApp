import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface DailyQuoteProps {
  content: string;
  bookTitle?: string;
  author?: string;
}

const DailyQuote = ({ content, bookTitle, author }: DailyQuoteProps) => {
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
        <div className="flex items-center gap-2 mb-5">
          <Sparkles size={14} className="text-accent" />
          <span className="text-accent text-xs font-medium tracking-wider uppercase">
            오늘의 문장
          </span>
        </div>

        <p className="text-foreground text-lg leading-relaxed font-light">
          "{content}"
        </p>

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
