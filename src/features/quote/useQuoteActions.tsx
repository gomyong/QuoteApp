import { useCallback, useMemo, useState } from "react";
import ActionSheet from "@/components/ActionSheet";
import EditQuoteSheet from "@/components/EditQuoteSheet";
import ShareQuoteSheet from "@/components/ShareQuoteSheet";
import { useAuth } from "@/features/auth/AuthProvider";
import { repo } from "@/sync/repo";
import { syncOnce } from "@/sync/syncEngine";
import { ensureCoverForBook } from "@/features/books/useEnsureCovers";
import type { Book, Quote } from "@/sync/types";
import { useTranslation } from "@/i18n/LanguageProvider";

type UseQuoteActionsOptions = {
  /** Look up the book for a given quote; used to pre-fill the edit sheet. */
  getBook: (quote: Quote) => Book | undefined;
  /** Called after a successful edit/delete so the caller can refetch. */
  onChanged?: () => void | Promise<void>;
};

/**
 * Wires the long-press → ActionSheet → EditQuoteSheet / delete-confirm flow.
 *
 * Usage:
 *   const { requestActions, portal } = useQuoteActions({ getBook, onChanged });
 *   ...
 *   <QuoteCard onLongPress={() => requestActions(quote)} ... />
 *   {portal}
 */
export const useQuoteActions = ({ getBook, onChanged }: UseQuoteActionsOptions) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [target, setTarget] = useState<Quote | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const requestActions = useCallback((quote: Quote) => {
    setTarget(quote);
    setSheetOpen(true);
  }, []);

  const handleEdit = useCallback(() => {
    setEditOpen(true);
  }, []);

  const handleShare = useCallback(() => {
    setShareOpen(true);
  }, []);

  const handleAskDelete = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!target) return;
    setSaving(true);
    try {
      await repo.softDeleteQuote(target.id);
      void syncOnce();
      await onChanged?.();
    } finally {
      setSaving(false);
      setConfirmOpen(false);
      setTarget(null);
    }
  }, [target, onChanged]);

  const handleSaveEdit = useCallback(
    async (patch: {
      content: string;
      thoughts: string | null;
      book: { title: string; author: string | null } | null;
    }) => {
      if (!target) return;
      setSaving(true);
      try {
        const updated = await repo.updateQuote(
          target.id,
          {
            content: patch.content,
            thoughts: patch.thoughts,
            book: patch.book,
          },
          user?.id ?? null,
        );
        void syncOnce();
        // If editing attached a (possibly new) book, try to backfill its
        // cover in the background — harmless if already covered.
        if (updated?.book_id) {
          void repo.getBook(updated.book_id).then((b) => {
            if (b) void ensureCoverForBook(b);
          });
        }
        await onChanged?.();
      } finally {
        setSaving(false);
        setEditOpen(false);
        setTarget(null);
      }
    },
    [target, user?.id, onChanged],
  );

  const book = target ? (getBook(target) ?? null) : null;

  const portal = useMemo(
    () => (
      <>
        <ActionSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title={target?.content ? `"${target.content.slice(0, 40)}${target.content.length > 40 ? "…" : ""}"` : undefined}
          items={[
            { id: "share", label: t("quote.share_image"), onSelect: handleShare },
            { id: "edit", label: t("quote.edit"), onSelect: handleEdit },
            { id: "delete", label: t("quote.delete"), destructive: true, onSelect: handleAskDelete },
          ]}
        />

        <ActionSheet
          open={confirmOpen}
          onClose={() => {
            setConfirmOpen(false);
            setTarget(null);
          }}
          title={t("quote.delete_confirm_title")}
          items={[
            {
              id: "confirm-delete",
              label: saving ? t("quote.deleting") : t("quote.delete"),
              destructive: true,
              onSelect: () => void handleConfirmDelete(),
            },
          ]}
        />

        <EditQuoteSheet
          open={editOpen}
          quote={target}
          book={book}
          saving={saving}
          onClose={() => {
            setEditOpen(false);
            setTarget(null);
          }}
          onSave={handleSaveEdit}
        />

        <ShareQuoteSheet
          open={shareOpen}
          content={target?.content ?? ""}
          bookTitle={book?.title ?? null}
          author={book?.author ?? null}
          onClose={() => {
            setShareOpen(false);
            // keep `target` around only if another sheet is open; here
            // the share sheet is terminal so we can drop it.
            if (!editOpen && !confirmOpen) setTarget(null);
          }}
        />
      </>
    ),
    [sheetOpen, target, confirmOpen, saving, editOpen, shareOpen, book, handleEdit, handleShare, handleAskDelete, handleConfirmDelete, handleSaveEdit, t],
  );

  return { requestActions, portal } as const;
};
