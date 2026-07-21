import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import DailyQuote from "@/components/DailyQuote";
import QuoteCard from "@/components/QuoteCard";
import BottomNav from "@/components/BottomNav";
import { useQuotes } from "@/sync/useQuotes";
import { repo } from "@/sync/repo";
import type { Book, Quote } from "@/sync/types";
import { useQuoteActions } from "@/features/quote/useQuoteActions";
import { useTranslation } from "@/i18n/LanguageProvider";

/**
 * Tiny deterministic PRNG seeded from a string (FNV-1a → mulberry32).
 * Used so "오늘의 문장" stays the same for the whole day (keyed by
 * YYYY-MM-DD) but rotates daily. No external dep.
 */
const seededIndex = (seed: string, length: number): number => {
  if (length <= 0) return 0;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // One mulberry32 step to spread consecutive seeds.
  h = (h + 0x6d2b79f5) >>> 0;
  let t = h;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const rand = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return Math.floor(rand * length);
};

const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const Index = () => {
  const { t } = useTranslation();
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

  const recent = quotes.slice(0, 10);

  const { requestActions, portal } = useQuoteActions({
    getBook: (q: Quote) => (q.book_id ? bookById.get(q.book_id) : undefined),
    onChanged: refresh,
  });

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12
      ? t("home.greeting_morning")
      : hour < 18
      ? t("home.greeting_afternoon")
      : t("home.greeting_evening");

  // "오늘의 문장" — deterministic random over the whole quote library.
  // `shuffleNonce` bumps when the user taps the shuffle icon so they can
  // re-roll on demand. By default the selection is stable for the current
  // calendar day (keyed by today's YYYY-MM-DD), so refreshing the home
  // tab doesn't keep swapping the featured quote.
  const [shuffleNonce, setShuffleNonce] = useState(0);

  const featured = useMemo<Quote | undefined>(() => {
    if (quotes.length === 0) return undefined;
    if (shuffleNonce === 0) {
      // Initial / day-stable pick
      const idx = seededIndex(`daily:${todayKey()}:${quotes.length}`, quotes.length);
      return quotes[idx];
    }
    // User-triggered shuffle: pick anything *other* than the current one
    // when possible, so tapping shuffle always visibly changes the card.
    const currentId =
      quotes[seededIndex(`daily:${todayKey()}:${quotes.length}`, quotes.length)]?.id;
    if (quotes.length === 1) return quotes[0];
    for (let i = 0; i < 5; i += 1) {
      const idx = seededIndex(
        `shuffle:${shuffleNonce}:${i}:${quotes.length}`,
        quotes.length,
      );
      if (quotes[idx].id !== currentId) return quotes[idx];
    }
    return quotes[seededIndex(`shuffle:${shuffleNonce}`, quotes.length)];
  }, [quotes, shuffleNonce]);

  const featuredBook = featured?.book_id ? bookById.get(featured.book_id) : undefined;

  const handleShuffle = useCallback(() => {
    if (quotes.length < 2) return;
    setShuffleNonce((n) => n + 1);
  }, [quotes.length]);

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
            <h1 className="text-foreground text-2xl font-semibold mt-1 font-display">
              {t("home.brand")}
            </h1>
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
              onShuffle={quotes.length > 1 ? handleShuffle : undefined}
            />
          ) : (
            <DailyQuote
              content={t("home.welcome_content")}
              bookTitle={t("home.welcome_book")}
              author={t("home.brand")}
            />
          )}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase mb-4">
            {t("home.recent_title")}
          </h3>
          <div className="space-y-3">
            {recent.length === 0 ? (
              <div className="glass rounded-2xl p-5 text-sm text-muted-foreground">
                {t("home.empty")}
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
                    onLongPress={() => requestActions(q)}
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
      {portal}
    </div>
  );
};

export default Index;
