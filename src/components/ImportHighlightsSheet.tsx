import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import {
  BookOpen,
  Check,
  ClipboardPaste,
  FileUp,
  Loader2,
  X,
} from "lucide-react";
import BookSearchInput from "@/components/BookSearchInput";
import { parseHighlights } from "@/features/import/parseHighlights";
import { useAuth } from "@/features/auth/AuthProvider";
import { ensureCoverForBook } from "@/features/books/useEnsureCovers";
import { repo } from "@/sync/repo";
import { syncOnce } from "@/sync/syncEngine";
import type { Book } from "@/sync/types";
import { useTranslation } from "@/i18n/LanguageProvider";
import { toast } from "@/components/ui/sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
};

const ImportHighlightsSheet = ({ open, onClose, onImported }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [rawText, setRawText] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [bookIsbn, setBookIsbn] = useState<string | null>(null);
  const [bookCoverUrl, setBookCoverUrl] = useState<string | null>(null);
  const [localBooks, setLocalBooks] = useState<Book[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    void repo.listBooksWithCounts().then(setLocalBooks);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const parsed = useMemo(() => parseHighlights(rawText), [rawText]);

  useEffect(() => {
    setSelectedIds(new Set(parsed.map((p) => p.id)));
  }, [parsed]);

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePasteClipboard = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        toast.error(t("import.clipboard_error"));
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.error(t("import.clipboard_empty"));
        return;
      }
      setRawText(text);
    } catch {
      toast.error(t("import.clipboard_error"));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setRawText(text);
    } catch {
      toast.error(t("import.file_error"));
    } finally {
      e.target.value = "";
    }
  };

  const selectedItems = parsed.filter((p) => selectedIds.has(p.id));
  const needsBookInput = parsed.some((p) => !p.bookTitle);

  const handleImport = async () => {
    if (selectedItems.length === 0 || importing) return;
    setImporting(true);
    try {
      const bookIdsToCheck = new Set<string>();
      for (const item of selectedItems) {
        const effectiveTitle = item.bookTitle || bookTitle.trim();
        const effectiveAuthor = item.bookTitle
          ? item.author
          : author.trim() || null;
        const matchesTypedBook =
          !item.bookTitle ||
          effectiveTitle.toLowerCase() === bookTitle.trim().toLowerCase();

        const saved = await repo.saveQuote(
          {
            content: item.content,
            thoughts: item.thoughts,
            page: item.page,
            book: effectiveTitle
              ? {
                  title: effectiveTitle,
                  author: effectiveAuthor,
                  isbn: matchesTypedBook ? bookIsbn : null,
                  cover_url: matchesTypedBook ? bookCoverUrl : null,
                }
              : null,
          },
          user?.id ?? null,
        );
        if (saved.book_id) bookIdsToCheck.add(saved.book_id);
      }

      void syncOnce();
      for (const id of bookIdsToCheck) {
        void repo.getBook(id).then((b) => {
          if (b && !b.cover_url) void ensureCoverForBook(b);
        });
      }

      toast.success(t("import.success", { count: selectedItems.length }));
      setRawText("");
      setBookTitle("");
      setAuthor("");
      setBookIsbn(null);
      setBookCoverUrl(null);
      onImported?.();
      onClose();
    } catch (err) {
      console.warn("[import] failed:", err);
      toast.error(t("import.error"));
    } finally {
      setImporting(false);
    }
  };

  const body = (
    <AnimatePresence>
      {open && (
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
            aria-label={t("import.title")}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[96] max-h-[92dvh] flex flex-col bg-background rounded-t-3xl"
          >
            <div className="pt-3 flex justify-center flex-none">
              <div className="h-1.5 w-10 rounded-full bg-glass-border/60" />
            </div>

            <div className="px-5 py-3 flex items-center justify-between flex-none">
              <div>
                <h2 className="text-foreground text-lg font-semibold font-display">
                  {t("import.title")}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("import.subtitle")}
                </p>
              </div>
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

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 space-y-4">
              {/* Quick source actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="glass rounded-xl py-2.5 px-3 flex items-center justify-center gap-2 text-xs text-foreground hover:bg-glass-border/20"
                >
                  <ClipboardPaste size={15} className="text-accent" />
                  <span>{t("import.paste_clipboard")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="glass rounded-xl py-2.5 px-3 flex items-center justify-center gap-2 text-xs text-foreground hover:bg-glass-border/20"
                >
                  <FileUp size={15} className="text-accent" />
                  <span>{t("import.pick_file")}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.text,text/plain,text/markdown"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Paste area */}
              <div className="glass rounded-2xl p-4">
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={t("import.placeholder")}
                  rows={5}
                  className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm leading-relaxed resize-none focus:outline-none"
                />
              </div>

              {/* Book attribution (for Ridi / Millie / generic blocks) */}
              {(parsed.length === 0 || needsBookInput) && (
                <div className="glass rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-accent">
                    <BookOpen size={14} />
                    <span className="text-xs font-medium">
                      {t("import.book_label")}
                    </span>
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
                    placeholder={t("capture.book_title_placeholder")}
                  />
                  <input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder={t("capture.book_author_placeholder")}
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none"
                  />
                </div>
              )}

              {/* Parsed highlight preview */}
              {parsed.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span>
                      {t("import.detected_count", { count: parsed.length })}
                    </span>
                    <span className="text-accent font-medium">
                      {t(`import.format_${parsed[0].format}`)}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                    {parsed.map((item) => {
                      const checked = selectedIds.has(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleItem(item.id)}
                          className={`w-full text-left rounded-xl p-3 flex items-start gap-3 transition-colors ${
                            checked
                              ? "glass ring-1 ring-accent/40"
                              : "bg-glass-border/10 opacity-60"
                          }`}
                        >
                          <span
                            className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                              checked
                                ? "bg-accent text-accent-foreground"
                                : "border border-muted-foreground/40"
                            }`}
                          >
                            {checked && <Check size={11} />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground leading-relaxed line-clamp-3">
                              {item.content}
                            </p>
                            {(item.bookTitle || item.page) && (
                              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                                {[
                                  item.bookTitle,
                                  item.author,
                                  item.page ? `p.${item.page}` : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-none px-5 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] border-t border-glass-border/20">
              <motion.button
                type="button"
                onClick={handleImport}
                disabled={selectedItems.length === 0 || importing}
                whileTap={{ scale: 0.97 }}
                className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-medium bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
                style={{ touchAction: "manipulation" }}
              >
                {importing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileUp size={16} />
                )}
                <span>
                  {selectedItems.length > 0
                    ? t("import.submit_count", { count: selectedItems.length })
                    : t("import.submit")}
                </span>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(body, document.body);
};

export default ImportHighlightsSheet;
