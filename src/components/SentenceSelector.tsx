/**
 * Reusable "pick which sentences" list.
 *
 * Extracted from the OCR flow (`features/ocr/QuoteSelector`) so the
 * share-as-image sheet can offer the exact same interaction — tap a
 * row to toggle inclusion, with a leading circular indicator that
 * fills on check. Selection state is owned by the parent so the
 * component stays presentational and trivial to reuse.
 *
 * Accessibility notes:
 *   - Each row is a real <button> (keyboard focusable, native hit
 *     target semantics).
 *   - `aria-pressed` reflects the selection state so screen readers
 *     announce toggles correctly.
 *   - The circular indicator uses `shrink-0 aspect-square` so it
 *     never gets squeezed out of round when the sentence wraps to
 *     multiple lines inside a flex row (same issue we fixed on the
 *     OCR selector).
 */

import { Check } from "lucide-react";

export type SentenceSelectorProps = {
  sentences: string[];
  /** Set of selected indices (0-based, matching `sentences`). */
  selected: Set<number>;
  onToggle: (index: number) => void;
  /** Optional extra classes on the outer container. */
  className?: string;
  /**
   * Tailwind max-height utility for the inner scroll area. Defaults to
   * `max-h-72` (~18rem) which fits the OCR review sheet; callers can
   * pass a tighter value for dense layouts.
   */
  maxHeightClass?: string;
};

const SentenceSelector = ({
  sentences,
  selected,
  onToggle,
  className,
  maxHeightClass = "max-h-72",
}: SentenceSelectorProps) => {
  if (sentences.length === 0) return null;

  return (
    <div
      className={`glass rounded-2xl p-3 ${maxHeightClass} overflow-y-auto space-y-2 ${
        className ?? ""
      }`}
    >
      {sentences.map((s, i) => {
        const isOn = selected.has(i);
        return (
          <button
            key={i}
            type="button"
            aria-pressed={isOn}
            onClick={() => onToggle(i)}
            className={`w-full text-left px-3 py-2 rounded-xl border transition-colors ${
              isOn
                ? "bg-accent/20 border-accent/40 text-foreground"
                : "border-glass-border/30 text-muted-foreground hover:bg-glass-border/10"
            }`}
          >
            <div className="flex items-start gap-2">
              <span
                className={`mt-0.5 inline-flex h-4 w-4 shrink-0 aspect-square items-center justify-center rounded-full border ${
                  isOn
                    ? "bg-accent border-accent text-accent-foreground"
                    : "border-muted-foreground/40"
                }`}
              >
                {isOn && <Check size={10} />}
              </span>
              <span className="text-sm leading-relaxed">{s}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default SentenceSelector;
