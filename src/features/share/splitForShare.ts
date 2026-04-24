/**
 * Split a saved quote into "share-granularity" units so the user can
 * cherry-pick which ones land on the exported image.
 *
 * The OCR pipeline has its own `splitIntoSentences` (in
 * `features/ocr/OcrService`) tuned for raw vision output — it
 * collapses all whitespace runs on the way in because OCR tends to
 * produce spurious newlines mid-sentence. The share path is kinder
 * to the user's intentional formatting: newlines that they typed
 * while editing the note usually mark real selection boundaries
 * (paragraph breaks, list items, couplets in a poem), so we treat
 * them as split points too.
 *
 * Split rules:
 *   - Any run of newlines (`\n+`).
 *   - Whitespace immediately following a sentence-ending mark:
 *       `.` `!` `?` `…`  plus CJK `。` `！` `？`.
 *
 * Returns trimmed, non-empty pieces. If no separator fires the
 * entire input is returned as a single element so callers can always
 * treat the result as `string[]`.
 */
export const splitForShare = (text: string): string[] => {
  if (!text) return [];
  const trimmed = text.trim();
  if (!trimmed) return [];
  const parts = trimmed
    .split(/\n+|(?<=[.!?…。！？])\s+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [trimmed];
};
