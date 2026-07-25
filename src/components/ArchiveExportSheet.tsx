import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import {
  Copy,
  FileDown,
  Layers,
  Loader2,
  NotebookPen,
  X,
} from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";
import { repo } from "@/sync/repo";
import type { Book, Quote } from "@/sync/types";
import { buildQuotesMarkdown } from "@/features/export/buildMarkdown";
import {
  copyMarkdownToClipboard,
  shareMarkdownFile,
} from "@/features/export/shareMarkdownFile";
import { exportToObsidian } from "@/features/export/obsidian";
import { exportQuotesToNotion } from "@/features/export/notion";
import {
  loadNotionConnection,
  saveNotionConnection,
  type NotionConnection,
} from "@/features/export/notionSettings";
import { usePro } from "@/features/iap/ProProvider";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called when a free user somehow opens this — should not happen. */
  onNeedPro?: () => void;
};

type Busy = null | "md" | "obsidian" | "notion" | "copy";

/**
 * Pro-only archive export sheet: Markdown, Obsidian, Notion.
 */
const ArchiveExportSheet = ({ open, onClose, onNeedPro }: Props) => {
  const { t } = useTranslation();
  const { isPro } = usePro();
  const [busy, setBusy] = useState<Busy>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [notion, setNotion] = useState<NotionConnection>({
    token: "",
    parentPageId: "",
  });
  const [showNotionForm, setShowNotionForm] = useState(false);

  useEffect(() => {
    if (!open) {
      setBusy(null);
      setStatus(null);
      return;
    }
    if (!isPro) {
      onNeedPro?.();
      onClose();
      return;
    }
    void loadNotionConnection().then((c) => {
      setNotion(c);
      if (c.token && c.parentPageId) setShowNotionForm(false);
    });
  }, [open, isPro, onClose, onNeedPro]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const loadArchive = async (): Promise<{
    quotes: Quote[];
    booksById: Map<string, Book>;
    markdown: string;
  }> => {
    const [quotes, books] = await Promise.all([
      repo.listQuotes(),
      repo.listBooks(),
    ]);
    const booksById = new Map(books.map((b) => [b.id, b]));
    const markdown = buildQuotesMarkdown(quotes, booksById);
    return { quotes, booksById, markdown };
  };

  const runMd = async () => {
    setBusy("md");
    setStatus(null);
    try {
      const { markdown, quotes } = await loadArchive();
      if (quotes.length === 0) {
        setStatus(t("archive.empty"));
        return;
      }
      const ok = await shareMarkdownFile(markdown);
      setStatus(ok ? t("archive.md_ok") : t("archive.cancelled"));
    } catch (e) {
      console.warn("[archive] md failed", e);
      setStatus(t("archive.error"));
    } finally {
      setBusy(null);
    }
  };

  const runObsidian = async () => {
    setBusy("obsidian");
    setStatus(null);
    try {
      const { markdown, quotes } = await loadArchive();
      if (quotes.length === 0) {
        setStatus(t("archive.empty"));
        return;
      }
      const res = await exportToObsidian(markdown);
      if (res.status === "opened_uri") setStatus(t("archive.obsidian_uri_ok"));
      else if (res.status === "shared_file") setStatus(t("archive.obsidian_file_ok"));
      else if (res.status === "cancelled") setStatus(t("archive.cancelled"));
      else setStatus(t("archive.error"));
    } catch (e) {
      console.warn("[archive] obsidian failed", e);
      setStatus(t("archive.error"));
    } finally {
      setBusy(null);
    }
  };

  const runCopy = async () => {
    setBusy("copy");
    setStatus(null);
    try {
      const { markdown, quotes } = await loadArchive();
      if (quotes.length === 0) {
        setStatus(t("archive.empty"));
        return;
      }
      const ok = await copyMarkdownToClipboard(markdown);
      setStatus(ok ? t("archive.copy_ok") : t("archive.error"));
    } finally {
      setBusy(null);
    }
  };

  const runNotion = async () => {
    setBusy("notion");
    setStatus(null);
    try {
      await saveNotionConnection(notion);
      const { quotes, booksById } = await loadArchive();
      if (quotes.length === 0) {
        setStatus(t("archive.empty"));
        return;
      }
      if (!notion.token.trim() || !notion.parentPageId.trim()) {
        setShowNotionForm(true);
        setStatus(t("archive.notion_need_config"));
        return;
      }
      const res = await exportQuotesToNotion(notion, quotes, booksById);
      if (res.status === "ok") {
        setStatus(
          res.pageUrl
            ? t("archive.notion_ok_url", { url: res.pageUrl })
            : t("archive.notion_ok"),
        );
      } else {
        setStatus(
          res.message === "notion_not_configured"
            ? t("archive.notion_need_config")
            : t("archive.notion_error", { msg: res.message }),
        );
      }
    } catch (e) {
      console.warn("[archive] notion failed", e);
      setStatus(t("archive.error"));
    } finally {
      setBusy(null);
    }
  };

  const ActionRow = ({
    icon,
    label,
    desc,
    onClick,
    id,
  }: {
    icon: React.ReactNode;
    label: string;
    desc: string;
    onClick: () => void;
    id: Busy;
  }) => (
    <button
      type="button"
      disabled={busy !== null}
      onClick={onClick}
      className="w-full text-left rounded-xl border border-glass-border/25 px-3 py-3 hover:bg-glass-border/10 disabled:opacity-60 flex items-start gap-3"
    >
      <span className="mt-0.5 text-accent flex-none">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="text-sm text-foreground font-medium block">{label}</span>
        <span className="text-[11px] text-muted-foreground leading-snug block mt-0.5">
          {desc}
        </span>
      </span>
      {busy === id ? (
        <Loader2 size={16} className="animate-spin text-muted-foreground mt-1" />
      ) : null}
    </button>
  );

  const body = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[95] bg-black/55 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t("archive.title")}
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
              <h2 className="text-foreground text-lg font-semibold font-display">
                {t("archive.title")}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("common.close")}
                className="p-2 rounded-full hover:bg-glass-border/20"
              >
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 space-y-2">
              <p className="text-xs text-muted-foreground mb-3">
                {t("archive.subtitle")}
              </p>

              <ActionRow
                id="md"
                icon={<FileDown size={18} />}
                label={t("archive.md")}
                desc={t("archive.md_desc")}
                onClick={() => void runMd()}
              />
              <ActionRow
                id="obsidian"
                icon={<NotebookPen size={18} />}
                label={t("archive.obsidian")}
                desc={t("archive.obsidian_desc")}
                onClick={() => void runObsidian()}
              />
              <ActionRow
                id="copy"
                icon={<Copy size={18} />}
                label={t("archive.copy")}
                desc={t("archive.copy_desc")}
                onClick={() => void runCopy()}
              />

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowNotionForm((v) => !v)}
                  className="text-xs text-accent mb-2"
                >
                  {showNotionForm
                    ? t("archive.notion_hide_config")
                    : t("archive.notion_show_config")}
                </button>
                {showNotionForm && (
                  <div className="space-y-2 mb-2 rounded-xl bg-glass-border/10 p-3">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {t("archive.notion_help")}
                    </p>
                    <input
                      type="password"
                      autoComplete="off"
                      placeholder={t("archive.notion_token_ph")}
                      value={notion.token}
                      onChange={(e) =>
                        setNotion((c) => ({ ...c, token: e.target.value }))
                      }
                      className="w-full text-xs rounded-lg border border-glass-border/30 bg-background px-3 py-2 text-foreground"
                    />
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder={t("archive.notion_page_ph")}
                      value={notion.parentPageId}
                      onChange={(e) =>
                        setNotion((c) => ({
                          ...c,
                          parentPageId: e.target.value,
                        }))
                      }
                      className="w-full text-xs rounded-lg border border-glass-border/30 bg-background px-3 py-2 text-foreground"
                    />
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void saveNotionConnection(notion)}
                      className="text-xs px-3 py-1.5 rounded-full bg-accent text-accent-foreground"
                    >
                      {t("archive.notion_save")}
                    </button>
                  </div>
                )}
                <ActionRow
                  id="notion"
                  icon={<Layers size={18} />}
                  label={t("archive.notion")}
                  desc={t("archive.notion_desc")}
                  onClick={() => void runNotion()}
                />
              </div>

              {status && (
                <p className="text-xs text-muted-foreground pt-3 leading-relaxed break-words">
                  {status}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(body, document.body);
};

export default ArchiveExportSheet;
