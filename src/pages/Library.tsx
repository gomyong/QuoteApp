import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Search } from "lucide-react";
import { Link } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import BookCover from "@/components/BookCover";
import { useQuotes } from "@/sync/useQuotes";
import { repo } from "@/sync/repo";
import type { Book } from "@/sync/types";
import { useEnsureCovers } from "@/features/books/useEnsureCovers";
import { useTranslation } from "@/i18n/LanguageProvider";

type ShelfBook = Book & { quoteCount: number; lastQuoteAt: string };

const UNASSIGNED_ID = "__unassigned__";

const Library = () => {
  const { t } = useTranslation();
  // We still subscribe to quotes so the shelf auto-refreshes after a
  // save/delete even if the user never leaves this tab.
  const { quotes } = useQuotes();
  const [query, setQuery] = useState("");
  const [shelf, setShelf] = useState<ShelfBook[]>([]);
  const [unassigned, setUnassigned] = useState<{ count: number; lastAt: string | null }>({
    count: 0,
    lastAt: null,
  });
  const [loading, setLoading] = useState(true);

  const refreshShelf = useCallback(async () => {
    const [books, un] = await Promise.all([
      repo.listBooksWithCounts(),
      repo.countUnassignedQuotes(),
    ]);
    setShelf(books);
    setUnassigned(un);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshShelf();
  }, [refreshShelf, quotes]);

  // Kick off Google Books cover resolution for any books still missing one.
  // Covers pop in as responses arrive — UI shows placeholder meanwhile.
  useEnsureCovers(shelf, refreshShelf);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shelf;
    return shelf.filter((b) => {
      return (
        b.title.toLowerCase().includes(q) ||
        (b.author ?? "").toLowerCase().includes(q)
      );
    });
  }, [shelf, query]);

  const totalBooks = shelf.length + (unassigned.count > 0 ? 1 : 0);
  const totalQuotes = quotes.length;

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      {/* Fixed header + search */}
      <header className="flex-none bg-background/80 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <h1 className="text-foreground text-2xl font-semibold font-display">
              {t("library.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {totalBooks > 0
                ? t("library.count", { books: totalBooks, quotes: totalQuotes })
                : t("library.empty")}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-xl flex items-center gap-3 px-4 py-3"
          >
            <Search size={16} className="text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("library.search_placeholder")}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none"
            />
          </motion.div>
        </div>
      </header>

      {/* Scrollable bookshelf (vertical card list) */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-lg mx-auto px-5 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {t("common.loading")}
            </div>
          ) : filtered.length === 0 && unassigned.count === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <p className="text-muted-foreground text-sm">
                {shelf.length === 0
                  ? t("library.empty_initial")
                  : t("library.empty_search")}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filtered.map((book, i) => (
                <BookRow key={book.id} book={book} index={i} />
              ))}
              {unassigned.count > 0 && !query.trim() && (
                <UnassignedRow count={unassigned.count} index={filtered.length} />
              )}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

type BookRowProps = { book: ShelfBook; index: number };

/**
 * Horizontal book card — small cover on the left, metadata + chevron on the
 * right. Matches the rhythm of the home's QuoteCard so the Library reads as
 * a natural list instead of a grid.
 */
const BookRow = ({ book, index }: BookRowProps) => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.25), ease: "easeOut" }}
    >
      <Link
        to={`/book/${book.id}`}
        className="glass rounded-2xl p-3 flex items-center gap-4 active:scale-[0.99] transition-transform"
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        <div className="w-14 shrink-0 aspect-[2/3]">
          <BookCover
            coverUrl={book.cover_url}
            title={book.title}
            author={book.author}
            rounded="rounded-md"
            className="w-full h-full"
            placeholderTextClass="text-[9px]"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-foreground text-sm font-medium line-clamp-2 leading-snug">
            {book.title}
          </div>
          {book.author && (
            <div className="text-muted-foreground text-xs mt-0.5 line-clamp-1">
              {book.author}
            </div>
          )}
          <div className="text-accent text-[11px] mt-1.5">
            {t("library.quote_count", { count: book.quoteCount })}
          </div>
        </div>

        <ChevronRight size={16} className="text-muted-foreground shrink-0" />
      </Link>
    </motion.div>
  );
};

const UnassignedRow = ({ count, index }: { count: number; index: number }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.25), ease: "easeOut" }}
    >
      <Link
        to={`/book/${UNASSIGNED_ID}`}
        className="glass rounded-2xl p-3 flex items-center gap-4 active:scale-[0.99] transition-transform"
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        <div className="w-14 shrink-0 aspect-[2/3] rounded-md border-2 border-dashed border-glass-border/50 bg-glass/20 flex items-center justify-center">
          <span className="text-muted-foreground text-base">📝</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-foreground text-sm font-medium">
            {t("library.unassigned_short")}
          </div>
          <div className="text-muted-foreground text-xs mt-0.5">
            {t("library.unassigned_desc")}
          </div>
          <div className="text-accent text-[11px] mt-1.5">
            {t("library.quote_count", { count })}
          </div>
        </div>

        <ChevronRight size={16} className="text-muted-foreground shrink-0" />
      </Link>
    </motion.div>
  );
};

export default Library;
