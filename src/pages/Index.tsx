import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import DailyQuote from "@/components/DailyQuote";
import QuoteCard from "@/components/QuoteCard";
import BottomNav from "@/components/BottomNav";
import { useQuotes } from "@/sync/useQuotes";
import { repo } from "@/sync/repo";
import type { Book } from "@/sync/types";

const Index = () => {
  const { quotes, refresh } = useQuotes();
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    repo.listBooks().then(setBooks);
  }, [quotes]);

  const bookById = useMemo(() => {
    const map = new Map<string, Book>();
    for (const b of books) map.set(b.id, b);
    return map;
  }, [books]);

  const recent = quotes.slice(0, 5);

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "좋은 아침이에요" : hour < 18 ? "좋은 오후예요" : "좋은 저녁이에요";

  const featured = recent[0];
  const featuredBook = featured?.book_id ? bookById.get(featured.book_id) : undefined;

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      {/* Fixed header */}
      <header className="flex-none bg-background/80 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-muted-foreground text-sm font-medium">{greeting} ✦</h2>
            <h1 className="text-foreground text-2xl font-semibold mt-1 font-display">Quote</h1>
          </motion.div>
        </div>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-lg mx-auto px-5 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        <div className="mb-8">
          {featured ? (
            <DailyQuote
              content={featured.content}
              bookTitle={featuredBook?.title}
              author={featuredBook?.author ?? undefined}
            />
          ) : (
            <DailyQuote
              content="첫 문장을 기록해보세요. 카메라로 찍으면 자동으로 글자가 인식돼요."
              bookTitle="환영합니다"
              author="Quote"
            />
          )}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase mb-4">
            최근 기록
          </h3>
          <div className="space-y-3">
            {recent.length === 0 ? (
              <div className="glass rounded-2xl p-5 text-sm text-muted-foreground">
                아직 기록이 없어요.
              </div>
            ) : (
              recent.map((q, i) => {
                const b = q.book_id ? bookById.get(q.book_id) : undefined;
                return (
                  <QuoteCard
                    key={q.id}
                    content={q.content}
                    bookTitle={b?.title}
                    author={b?.author ?? undefined}
                    thoughts={q.thoughts ?? undefined}
                    isFavorite={q.is_favorite}
                    onToggleFavorite={async () => {
                      await repo.toggleFavorite(q.id);
                      refresh();
                    }}
                    index={i}
                  />
                );
              })
            )}
          </div>
        </motion.div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
