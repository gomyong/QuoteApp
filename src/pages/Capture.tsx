import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Mic, Type, BookOpen, Tag, Send, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import CaptureFromImage from "@/features/capture/CaptureFromImage";
import type { PickedImage } from "@/features/ocr/pickImage";
import { useAuth } from "@/features/auth/AuthProvider";
import { repo } from "@/sync/repo";
import { syncOnce } from "@/sync/syncEngine";
import { ensureCoverForBook } from "@/features/books/useEnsureCovers";
import { useTranslation } from "@/i18n/LanguageProvider";
import type { Book } from "@/sync/types";
import { toast } from "@/components/ui/sonner";

const Capture = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [thoughts, setThoughts] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showOcr, setShowOcr] = useState(false);
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const lastImageRef = useRef<PickedImage | null>(null);
  const quoteInputRef = useRef<HTMLTextAreaElement | null>(null);

  const loadRecentBooks = async () => {
    const books = await repo.listBooksWithCounts();
    setRecentBooks(books.slice(0, 3));
  };

  useEffect(() => {
    void loadRecentBooks();
  }, []);

  const handleSave = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      const savedQuote = await repo.saveQuote(
        {
          content,
          thoughts,
          book: bookTitle.trim()
            ? { title: bookTitle, author: author || null }
            : null,
          image: lastImageRef.current
            ? { base64: lastImageRef.current.base64, mime: lastImageRef.current.mimeType }
            : null,
        },
        user?.id ?? null,
      );
      lastImageRef.current = null;
      setSaved(true);
      void syncOnce();

      // Fire-and-forget: pull a cover through the provider chain for the
      // linked book. Repeats are cheap because ensureCoverForBook skips
      // records that already have covers or were attempted this session.
      if (savedQuote.book_id) {
        void repo.getBook(savedQuote.book_id).then((b) => {
          if (b) void ensureCoverForBook(b);
        });
      }
      void loadRecentBooks();
      setTimeout(() => {
        setSaved(false);
        setContent("");
        setBookTitle("");
        setAuthor("");
        setThoughts("");
      }, 1400);
    } catch (e) {
      console.warn("[capture] save failed:", e);
      toast.error(t("capture.save_error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      {/* Fixed header (does not scroll) */}
      <header className="flex-none bg-background/80 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-foreground text-2xl font-semibold font-display">
              {t("capture.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("capture.subtitle")}
            </p>
          </motion.div>
        </div>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-lg mx-auto px-5 pt-2 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        {/* Input Methods */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3 mb-6"
        >
          {[
            { icon: Camera, key: "photo", label: t("capture.from_photo"), onClick: () => setShowOcr(true) },
            { icon: Mic, key: "voice", label: t("capture.from_voice"), onClick: () => undefined, disabled: true },
            {
              icon: Type,
              key: "type",
              label: t("capture.type_directly"),
              onClick: () => quoteInputRef.current?.focus(),
            },
          ].map(({ icon: Icon, key, label, onClick, disabled }) => (
            <button
              key={key}
              onClick={onClick}
              disabled={disabled}
              className="flex-1 glass rounded-xl py-3 flex flex-col items-center gap-1.5 hover:bg-glass-border/20 transition-colors active:scale-[0.98] disabled:opacity-50"
            >
              <Icon size={18} className="text-accent" />
              <span className="text-muted-foreground text-xs">{label}</span>
            </button>
          ))}
        </motion.div>

        {/* Quote Input */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="glass rounded-2xl p-4">
            <textarea
              ref={quoteInputRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("capture.quote_placeholder")}
              rows={4}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-base leading-relaxed resize-none focus:outline-none"
            />
          </div>

          {/* Book Info */}
          <div className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-accent mb-1">
              <BookOpen size={14} />
              <span className="text-xs font-medium">{t("capture.book_info_label")}</span>
            </div>
            <input
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              placeholder={t("capture.book_title_placeholder")}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none border-b border-border/30 pb-2"
            />
            {recentBooks.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] text-muted-foreground">
                  {t("capture.recent_books")}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {recentBooks.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => {
                        setBookTitle(book.title);
                        setAuthor(book.author ?? "");
                      }}
                      className="shrink-0 rounded-full bg-glass-border/10 px-3 py-1.5 text-xs text-foreground hover:bg-glass-border/20"
                    >
                      {book.title}
                      {book.author ? ` · ${book.author}` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder={t("capture.book_author_placeholder")}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none"
            />
          </div>

          {/* Thoughts */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 text-accent mb-2">
              <Tag size={14} />
              <span className="text-xs font-medium">{t("capture.thought_label")}</span>
            </div>
            <textarea
              value={thoughts}
              onChange={(e) => setThoughts(e.target.value)}
              placeholder={t("capture.thought_placeholder")}
              rows={2}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm leading-relaxed resize-none focus:outline-none"
            />
          </div>

          {/* Save Button */}
          <motion.button
            onClick={handleSave}
            disabled={saving}
            whileTap={{ scale: 0.97 }}
            className={`w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-medium transition-all duration-300 disabled:opacity-70 ${
              saved
                ? "bg-accent/20 text-accent"
                : "bg-accent text-accent-foreground hover:bg-accent/90"
            }`}
          >
            {saved ? (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                ✓ {t("capture.saved")}
              </motion.span>
            ) : saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{t("capture.saving")}</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>{t("capture.save")}</span>
              </>
            )}
          </motion.button>
        </motion.div>
        </div>
      </main>

      {!showOcr && <BottomNav />}

      {showOcr && (
        <CaptureFromImage
          onClose={() => setShowOcr(false)}
          onConfirm={(text, image) => {
            setContent((prev) => (prev ? `${prev.trim()}\n${text}` : text));
            lastImageRef.current = image ?? null;
            setShowOcr(false);
          }}
        />
      )}
    </div>
  );
};

export default Capture;
