import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Loader2, Plus, Send } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BookCover from "@/components/BookCover";
import QuoteCard from "@/components/QuoteCard";
import { useQuoteActions } from "@/features/quote/useQuoteActions";
import { ensureCoverForBook } from "@/features/books/useEnsureCovers";
import { useQuotes } from "@/sync/useQuotes";
import { repo } from "@/sync/repo";
import { syncOnce } from "@/sync/syncEngine";
import { useAuth } from "@/features/auth/AuthProvider";
import type { Book, Quote } from "@/sync/types";
import { useTranslation } from "@/i18n/LanguageProvider";
import { toast } from "@/components/ui/sonner";

const UNASSIGNED_ID = "__unassigned__";

const BookDetail = () => {
  const { t } = useTranslation();
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { quotes } = useQuotes();
  const { user } = useAuth();
  const isUnassigned = bookId === UNASSIGNED_ID;

  const [book, setBook] = useState<Book | null>(null);
  const [list, setList] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  const [composerOpen, setComposerOpen] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newThoughts, setNewThoughts] = useState("");
  const [savingQuote, setSavingQuote] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

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

  const openComposer = () => {
    setComposerOpen(true);
    setTimeout(() => composerRef.current?.focus(), 80);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setNewContent("");
    setNewThoughts("");
  };

  const handleAddQuote = async () => {
    if (!newContent.trim() || savingQuote) return;
    setSavingQuote(true);
    try {
      await repo.saveQuote(
        {
          content: newContent,
          thoughts: newThoughts,
          book: !isUnassigned && book?.title ? { title: book.title, author: book.author } : null,
        },
        user?.id ?? null,
      );
      void syncOnce();
      toast.success(t("capture.saved"));
      closeComposer();
      void refresh();
    } catch (e) {
      console.warn("[book] add quote failed:", e);
      toast.error(t("capture.save_error"));
    } finally {
      setSavingQuote(false);
    }
  };

  // If the last quote for this book was deleted, the book itself disappears
  // from the shelf — bounce the user back rather than showing an empty page.
  useEffect(() => {
    if (!loading && !isUnassigned && list.length === 0 && !book) {
      navigate("/library", { replace: true });
    }
  }, [loading, isUnassigned, list.length, book, navigate]);

  const title = isUnassigned ? t("library.unassigned_short") : (book?.title ?? "");
  const author = isUnassigned ? null : (book?.author ?? null);

  const subtitleCount = useMemo(() => {
    return t("book.quote_count", { count: list.length });
  }, [list.length, t]);

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      {/* Fixed header with back button */}
      <header className="flex-none bg-background/80 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
          <div className="flex items-center gap-2 -ml-2">
            <Link
              to="/library"
              aria-label={t("book.back_label")}
              className="p-2 rounded-full hover:bg-glass-border/20 active:scale-95"
              style={{ touchAction: "manipulation" }}
            >
              <ChevronLeft size={22} className="text-foreground" />
            </Link>
            <span className="text-muted-foreground text-sm">{t("book.back_to_library")}</span>
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
                {title || t("book.unknown_title")}
              </h1>
              {author && (
                <p className="text-muted-foreground text-sm mt-1">{author}</p>
              )}
              <p className="text-accent text-xs mt-2">{subtitleCount}</p>
            </div>
          </motion.div>

          {/* Add-quote composer */}
          {!loading && (
            <div className="mb-5">
              <AnimatePresence initial={false} mode="wait">
                {composerOpen ? (
                  <motion.div
                    key="composer"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="glass rounded-2xl p-4 space-y-3"
                  >
                    <textarea
                      ref={composerRef}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder={t("book.add_quote_hint")}
                      rows={3}
                      className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-base leading-relaxed resize-none focus:outline-none"
                    />
                    <textarea
                      value={newThoughts}
                      onChange={(e) => setNewThoughts(e.target.value)}
                      placeholder={t("capture.thought_placeholder")}
                      rows={2}
                      className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm leading-relaxed resize-none focus:outline-none border-t border-border/30 pt-3"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={closeComposer}
                        className="rounded-xl px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-glass-border/20 active:scale-95"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={handleAddQuote}
                        disabled={savingQuote || !newContent.trim()}
                        className="rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-60 active:scale-95"
                      >
                        {savingQuote ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Send size={15} />
                        )}
                        <span>{t("capture.save")}</span>
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    key="composer-toggle"
                    type="button"
                    onClick={openComposer}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full glass rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-medium text-accent hover:bg-glass-border/20 active:scale-[0.99]"
                  >
                    <Plus size={16} />
                    <span>{t("book.add_quote")}</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Quote list */}
          {loading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {t("common.loading")}
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {t("book.empty_quotes")}
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
