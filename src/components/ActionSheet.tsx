import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

export type ActionSheetItem = {
  id: string;
  label: string;
  destructive?: boolean;
  onSelect: () => void;
};

type Props = {
  open: boolean;
  title?: string;
  items: ActionSheetItem[];
  onClose: () => void;
};

/**
 * iOS-style bottom action sheet.
 *
 * - Tapping the backdrop, hitting ESC, or pressing "취소" closes it.
 * - Items with `destructive` are tinted red (e.g. 삭제).
 * - Rendered in a portal at document.body so it escapes any clipped/fixed
 *   parents (e.g. our page shells with `overflow:hidden`).
 */
const ActionSheet = ({ open, title, items, onClose }: Props) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const content = (
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
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-[2px]"
            aria-hidden="true"
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title ?? "동작 선택"}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
            className="fixed inset-x-0 bottom-0 z-[91] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]"
          >
            <div className="max-w-lg mx-auto">
              <div className="rounded-2xl bg-surface-elevated/90 backdrop-blur-xl border border-glass-border/30 overflow-hidden shadow-2xl">
                {title && (
                  <div className="px-4 py-3 text-center text-xs text-muted-foreground border-b border-glass-border/20">
                    {title}
                  </div>
                )}
                {items.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      // Defer so the sheet can unmount cleanly before any
                      // handler that opens another modal (e.g. edit sheet).
                      setTimeout(() => item.onSelect(), 0);
                    }}
                    className={
                      "w-full text-center py-4 text-base font-medium transition-colors active:bg-glass-border/30 " +
                      (item.destructive ? "text-destructive" : "text-foreground") +
                      (i < items.length - 1 ? " border-b border-glass-border/20" : "")
                    }
                    style={{ touchAction: "manipulation" }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-2 w-full rounded-2xl py-4 text-base font-semibold bg-surface-elevated/90 backdrop-blur-xl border border-glass-border/30 text-foreground active:bg-glass-border/30"
                style={{ touchAction: "manipulation" }}
              >
                취소
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
};

export default ActionSheet;
