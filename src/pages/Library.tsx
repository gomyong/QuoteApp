import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import QuoteCard from "@/components/QuoteCard";
import BottomNav from "@/components/BottomNav";
import { useQuotes } from "@/sync/useQuotes";
import { repo } from "@/sync/repo";
import type { Book } from "@/sync/types";

const Library = () => {
  const { quotes, refresh, loading } = useQuotes();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "favorites">("all");
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    repo.listBooks().then(setBooks);
  }, [quotes]);

  const bookById = useMemo(() => {
    const map = new Map<string, Book>();
    for (const b of books) map.set(b.id, b);
    return map;
  }, [books]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quotes.filter((quote) => {
      const book = quote.book_id ? bookById.get(quote.book_id) : undefined;
      const matchesQuery =
        !q ||
        quote.content.toLowerCase().includes(q) ||
        quote.thoughts?.toLowerCase().includes(q) ||
        book?.title.toLowerCase().includes(q) ||
        book?.author?.toLowerCase().includes(q);
      const matchesFilter = filter === "all" || quote.is_favorite;
      return matchesQuery && matchesFilter;
    });
  }, [quotes, query, filter, bookById]);

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      {/* Fixed header + search + filters */}
      <header className="flex-none bg-background/80 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <h1 className="text-foreground text-2xl font-semibold font-display">서재</h1>
            <p className="text-muted-foreground text-sm mt-1">{quotes.length}개의 문장</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-xl flex items-center gap-3 px-4 py-3 mb-3"
          >
            <Search size={16} className="text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="문장, 책, 저자 검색..."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none"
            />
            <button className="p-1" aria-label="옵션">
              <SlidersHorizontal size={14} className="text-muted-foreground" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex gap-2"
          >
            {(["all", "favorites"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filter === f ? "bg-accent text-accent-foreground" : "glass text-muted-foreground"
                }`}
              >
                {f === "all" ? "전체" : "즐겨찾기"}
              </button>
            ))}
          </motion.div>
        </div>
      </header>

      {/* Scrollable quote list */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-lg mx-auto px-5 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
          <div className="space-y-3">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground text-sm">불러오는 중...</div>
          ) : filtered.length > 0 ? (
            filtered.map((quote, i) => {
              const book = quote.book_id ? bookById.get(quote.book_id) : undefined;
              return (
                <QuoteCard
                  key={quote.id}
                  content={quote.content}
                  bookTitle={book?.title}
                  author={book?.author ?? undefined}
                  thoughts={quote.thoughts ?? undefined}
                  isFavorite={quote.is_favorite}
                  onToggleFavorite={async () => {
                    await repo.toggleFavorite(quote.id);
                    refresh();
                  }}
                  index={i}
                />
              );
            })
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <p className="text-muted-foreground text-sm">
                {quotes.length === 0 ? "아직 기록이 없어요. 첫 문장을 남겨볼까요?" : "검색 결과가 없어요"}
              </p>
            </motion.div>
          )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Library;
