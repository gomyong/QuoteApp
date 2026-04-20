import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import BookCover from "@/components/BookCover";
import { useQuotes } from "@/sync/useQuotes";
import { repo } from "@/sync/repo";
import type { Book } from "@/sync/types";
import { useEnsureCovers } from "@/features/books/useEnsureCovers";

type ShelfBook = Book & { quoteCount: number; lastQuoteAt: string };

const UNASSIGNED_ID = "__unassigned__";

const Library = () => {
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
            <h1 className="text-foreground text-2xl font-semibold font-display">서재</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {totalBooks > 0
                ? `${totalBooks}권 · 문장 ${totalQuotes}개`
                : "아직 책이 없어요"}
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
              placeholder="책 제목, 저자 검색..."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none"
            />
          </motion.div>
        </div>
      </header>

      {/* Scrollable bookshelf */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-lg mx-auto px-5 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              불러오는 중...
            </div>
          ) : filtered.length === 0 && unassigned.count === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <p className="text-muted-foreground text-sm">
                {shelf.length === 0
                  ? "첫 문장을 기록하면 책이 여기에 꽂혀요"
                  : "검색 결과가 없어요"}
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              {filtered.map((book, i) => (
                <BookTile key={book.id} book={book} index={i} />
              ))}
              {unassigned.count > 0 && !query.trim() && (
                <UnassignedTile
                  count={unassigned.count}
                  index={filtered.length}
                />
              )}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

type BookTileProps = { book: ShelfBook; index: number };

const BookTile = ({ book, index }: BookTileProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
  >
    <Link
      to={`/book/${book.id}`}
      className="block active:scale-[0.98] transition-transform"
      style={{ touchAction: "manipulation" }}
    >
      <div className="aspect-[2/3] w-full">
        <BookCover
          coverUrl={book.cover_url}
          title={book.title}
          author={book.author}
          rounded="rounded-lg"
          className="w-full h-full"
        />
      </div>
      <div className="mt-3">
        <div className="text-foreground text-sm font-medium line-clamp-2 leading-snug">
          {book.title}
        </div>
        {book.author && (
          <div className="text-muted-foreground text-xs mt-0.5 line-clamp-1">
            {book.author}
          </div>
        )}
        <div className="text-accent text-[11px] mt-1">문장 {book.quoteCount}개</div>
      </div>
    </Link>
  </motion.div>
);

const UnassignedTile = ({ count, index }: { count: number; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
  >
    <Link
      to={`/book/${UNASSIGNED_ID}`}
      className="block active:scale-[0.98] transition-transform"
      style={{ touchAction: "manipulation" }}
    >
      <div className="aspect-[2/3] w-full rounded-lg border-2 border-dashed border-glass-border/50 bg-glass/20 flex items-center justify-center text-center px-3">
        <div>
          <div className="text-muted-foreground text-xs mb-1">📝</div>
          <div className="text-foreground text-sm font-medium">미분류</div>
          <div className="text-muted-foreground text-xs mt-1">
            책 정보 없이 기록한 문장
          </div>
        </div>
      </div>
      <div className="mt-3">
        <div className="text-foreground text-sm font-medium">미분류</div>
        <div className="text-accent text-[11px] mt-1">문장 {count}개</div>
      </div>
    </Link>
  </motion.div>
);

export default Library;
