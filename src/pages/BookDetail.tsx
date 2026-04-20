import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BookCover from "@/components/BookCover";
import QuoteCard from "@/components/QuoteCard";
import { useQuoteActions } from "@/features/quote/useQuoteActions";
import { ensureCoverForBook } from "@/features/books/useEnsureCovers";
import { useQuotes } from "@/sync/useQuotes";
import { repo } from "@/sync/repo";
import type { Book, Quote } from "@/sync/types";

const UNASSIGNED_ID = "__unassigned__";

const BookDetail = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { quotes } = useQuotes();
  const isUnassigned = bookId === UNASSIGNED_ID;

  const [book, setBook] = useState<Book | null>(null);
  const [list, setList] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!bookId) return;
    if (isUnassigned) {
      const qs = await repo.listQuotesByBook(null);
      setBook(null);
      setList(qs);
    } else {
      const [b, qs] = await Promise.all([
        repo.getBook(bookId),
        repo.listQuotesByBook(bookId),
      ]);
      setBook(b ?? null);
      setList(qs);
    }
    setLoading(false);
  }, [bookId, isUnassigned]);

  useEffect(() => {
    void refresh();
  }, [refresh, quotes]);

  // Fetch a cover once if this book arrived with none.
  useEffect(() => {
    if (!book || book.cover_url) return;
    void ensureCoverForBook(book).then((updated) => {
      if (updated) void refresh();
    });
  }, [book, refresh]);

  const { requestActions, portal } = useQuoteActions({
    getBook: () => book ?? undefined,
    onChanged: refresh,
  });

  // If the last quote for this book was deleted, the book itself disappears
  // from the shelf — bounce the user back rather than showing an empty page.
  useEffect(() => {
    if (!loading && !isUnassigned && list.length === 0 && !book) {
      navigate("/library", { replace: true });
    }
  }, [loading, isUnassigned, list.length, book, navigate]);

  const title = isUnassigned ? "미분류" : (book?.title ?? "");
  const author = isUnassigned ? null : (book?.author ?? null);

  const subtitleCount = useMemo(() => {
    return `문장 ${list.length}개`;
  }, [list.length]);

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      {/* Fixed header with back button */}
      <header className="flex-none bg-background/80 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
          <div className="flex items-center gap-2 -ml-2">
            <Link
              to="/library"
              aria-label="돌아가기"
              className="p-2 rounded-full hover:bg-glass-border/20 active:scale-95"
              style={{ touchAction: "manipulation" }}
            >
              <ChevronLeft size={22} className="text-foreground" />
            </Link>
            <span className="text-muted-foreground text-sm">서재</span>
          </div>
        </div>
      </header>

      {/* Scrollable body: hero + quotes */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-lg mx-auto px-5 pt-2 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 items-end mb-6"
          >
            <div className="w-28 shrink-0 aspect-[2/3]">
              {isUnassigned ? (
                <div className="w-full h-full rounded-lg border-2 border-dashed border-glass-border/50 bg-glass/20 flex items-center justify-center text-2xl">
                  📝
                </div>
              ) : (
                <BookCover
                  coverUrl={book?.cover_url}
                  title={title}
                  author={author}
                  rounded="rounded-lg"
                  className="w-full h-full"
                  placeholderTextClass="text-sm"
                />
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-foreground text-xl font-semibold font-display leading-tight">
                {title || "제목 없음"}
              </h1>
              {author && (
                <p className="text-muted-foreground text-sm mt-1">{author}</p>
              )}
              <p className="text-accent text-xs mt-2">{subtitleCount}</p>
            </div>
          </motion.div>

          {/* Quote list */}
          {loading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              불러오는 중...
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              이 책의 문장이 아직 없어요
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((q, i) => (
                <QuoteCard
                  key={q.id}
                  content={q.content}
                  bookTitle={book?.title}
                  author={book?.author ?? undefined}
                  thoughts={q.thoughts ?? undefined}
                  isFavorite={q.is_favorite}
                  onToggleFavorite={async () => {
                    await repo.toggleFavorite(q.id);
                    refresh();
                  }}
                  onLongPress={() => requestActions(q)}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {portal}
    </div>
  );
};

export default BookDetail;
