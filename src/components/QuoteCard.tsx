import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useState } from "react";

interface QuoteCardProps {
  content: string;
  bookTitle?: string;
  author?: string;
  thoughts?: string;
  isFavorite?: boolean;
  createdAt?: string;
  index?: number;
}

const QuoteCard = ({
  content,
  bookTitle,
  author,
  thoughts,
  isFavorite = false,
  createdAt,
  index = 0,
}: QuoteCardProps) => {
  const [liked, setLiked] = useState(isFavorite);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      className="glass rounded-2xl p-5 group relative overflow-hidden"
    >
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-accent/5 to-transparent" />

      <p className="text-foreground/90 text-base leading-relaxed font-light relative z-10">
        "{content}"
      </p>

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
          onClick={() => setLiked(!liked)}
          className="p-1.5 rounded-full transition-all duration-300"
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
