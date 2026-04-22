import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { BookOpen, Loader2, Save, Tag, X } from "lucide-react";
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
    book: { title: string; author: string | null } | null;
  }) => void | Promise<void>;
};

/**
 * Full-height-ish bottom sheet for editing an existing quote. Mounts in a
 * portal so it isn't clipped by any scrollable container. ESC / backdrop /
 * the X button all close. All fields are pre-filled from the quote and book.
 */
const EditQuoteSheet = ({ open, quote, book, saving, onClose, onSave }: Props) => {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [thoughts, setThoughts] = useState("");

  // Hydrate form whenever the sheet (re-)opens on a new quote.
  useEffect(() => {
    if (!open) return;
    setContent(quote?.content ?? "");
    setThoughts(quote?.thoughts ?? "");
    setBookTitle(book?.title ?? "");
    setAuthor(book?.author ?? "");
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
    void onSave({
      content: trimmedContent,
      thoughts: thoughts.trim() ? thoughts.trim() : null,
      book: trimmedTitle ? { title: trimmedTitle, author: author.trim() || null } : null,
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
                  <input
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    placeholder={t("edit.book_title_placeholder")}
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none border-b border-border/30 pb-2"
                  />
                  <input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder={t("capture.book_author_placeholder")}
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none"
                  />
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
