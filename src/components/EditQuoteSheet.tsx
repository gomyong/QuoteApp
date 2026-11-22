import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { BookOpen, Loader2, Save, Tag, X } from "lucide-react";
import BookSearchInput from "@/components/BookSearchInput";
import { repo } from "@/sync/repo";
import type { Quote, Book } from "@/sync/types";
import { useTranslation } from "@/i18n/LanguageProvider";

type Props = {
  open: boolean;
  quote: Quote | null;
  book: Book | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (patch: {
    content: string;
    thoughts: string | null;
    page?: number | null;
    book: {
      title: string;
      author: string | null;
      isbn?: string | null;
      cover_url?: string | null;
    } | null;
  }) => void | Promise<void>;
};

const EditQuoteSheet = ({ open, quote, book, saving, onClose, onSave }: Props) => {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [bookIsbn, setBookIsbn] = useState<string | null>(null);
  const [bookCoverUrl, setBookCoverUrl] = useState<string | null>(null);
  const [pageStr, setPageStr] = useState("");
  const [thoughts, setThoughts] = useState("");
  const [localBooks, setLocalBooks] = useState<Book[]>([]);

  // Hydrate form whenever the sheet (re-)opens on a new quote.
  useEffect(() => {
    if (!open) return;
    setContent(quote?.content ?? "");
    setThoughts(quote?.thoughts ?? "");
    setPageStr(typeof quote?.page === "number" && quote.page > 0 ? String(quote.page) : "");
    setBookTitle(book?.title ?? "");
    setAuthor(book?.author ?? "");
    setBookIsbn(book?.isbn ?? null);
    setBookCoverUrl(book?.cover_url ?? null);
    void repo.listBooksWithCounts().then(setLocalBooks);
  }, [open, quote, book]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSubmit = () => {
    if (saving) return;
    const trimmedContent = content.trim();
    if (!trimmedContent) return;
    const trimmedTitle = bookTitle.trim();
    const parsedPage = pageStr.trim() ? Number.parseInt(pageStr.trim(), 10) : null;
    const validPage =
      parsedPage !== null && Number.isFinite(parsedPage) && parsedPage >= 0 && parsedPage <= 99999
        ? parsedPage
        : null;
    void onSave({
      content: trimmedContent,
      thoughts: thoughts.trim() ? thoughts.trim() : null,
      page: validPage,
      book: trimmedTitle
        ? {
            title: trimmedTitle,
            author: author.trim() || null,
            isbn: bookIsbn,
            cover_url: bookCoverUrl,
          }
        : null,
    });
  };

  const content_ = (
    <AnimatePresence>
      {open && quote && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-[95] bg-black/55 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t("edit.title")}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[96] max-h-[92dvh] flex flex-col bg-background rounded-t-3xl"
          >
            {/* grabber */}
            <div className="pt-3 flex justify-center flex-none">
              <div className="h-1.5 w-10 rounded-full bg-glass-border/60" />
            </div>

            {/* header */}
            <div className="px-5 py-3 flex items-center justify-between flex-none">
              <h2 className="text-foreground text-lg font-semibold font-display">
                {t("edit.title")}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("common.close")}
                className="p-2 rounded-full hover:bg-glass-border/20"
                style={{ touchAction: "manipulation" }}
              >
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            {/* scrollable body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
              <div className="space-y-4">
                <div className="glass rounded-2xl p-4">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t("capture.quote_placeholder")}
                    rows={5}
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-base leading-relaxed resize-none focus:outline-none"
                  />
                </div>

                <div className="glass rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-accent mb-1">
                    <BookOpen size={14} />
                    <span className="text-xs font-medium">{t("capture.book_info_label")}</span>
                  </div>
                  <BookSearchInput
                    value={bookTitle}
                    onChange={(val) => {
                      setBookTitle(val);
                      setBookIsbn(null);
                      setBookCoverUrl(null);
                    }}
                    onSelect={(meta) => {
                      setBookTitle(meta.title);
                      setAuthor(meta.author ?? "");
                      setBookIsbn(meta.isbn);
                      setBookCoverUrl(meta.coverUrl);
                    }}
                    localBooks={localBooks}
                    placeholder={t("edit.book_title_placeholder")}
                  />
                  <div className="grid grid-cols-3 gap-3 items-center">
                    <input
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder={t("capture.book_author_placeholder")}
                      className="col-span-2 bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none"
                    />
                    <div className="flex items-center gap-1 border-l border-border/30 pl-3">
                      <span className="text-xs text-muted-foreground">p.</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={99999}
                        value={pageStr}
                        onChange={(e) => setPageStr(e.target.value)}
                        placeholder={t("capture.page_placeholder")}
                        className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-accent mb-2">
                    <Tag size={14} />
                    <span className="text-xs font-medium">{t("capture.thought_label")}</span>
                  </div>
                  <textarea
                    value={thoughts}
                    onChange={(e) => setThoughts(e.target.value)}
                    placeholder={t("capture.thought_placeholder")}
                    rows={3}
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm leading-relaxed resize-none focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* footer */}
            <div className="flex-none px-5 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] border-t border-glass-border/20">
              <motion.button
                type="button"
                onClick={handleSubmit}
                disabled={saving || !content.trim()}
                whileTap={{ scale: 0.97 }}
                className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-medium bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
                style={{ touchAction: "manipulation" }}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{t("edit.saving")}</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>{t("edit.save")}</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content_, document.body);
};

export default EditQuoteSheet;
