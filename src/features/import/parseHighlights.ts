/**
 * Smart e-book / reading-note highlight parser.
 *
 * Auto-detects and parses:
 *   1. Kindle `My Clippings.txt` (`==========` separated entries)
 *   2. Ridi (리디북스) copied reading notes (`YYYY.MM.DD` + UI noise stripping)
 *   3. Generic / Millie / Kyobo SAM / Markdown bullet or blank-line blocks
 */

export type ImportFormat = "kindle" | "ridi" | "generic";

export type ParsedHighlight = {
  id: string;
  content: string;
  thoughts: string | null;
  bookTitle: string | null;
  author: string | null;
  page: number | null;
  format: ImportFormat;
};

const KINDLE_SEP = /={5,}/;
const RIDI_DATE_LINE = /^\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}\.?(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/;
const RIDI_NOISE_LINE =
  /^(?:삭제|공유|수정|신고|메모|하이라이트|독서노트|더보기|\d+개\s*더보기|전체\s*선택|복사|형광펜)$/i;

const extractTrailingPage = (
  text: string,
): { cleaned: string; page: number | null } => {
  // Match trailing `(p.142)`, `[p.142]`, `(142쪽)`, `— p.142`
  const m = text.match(
    /(?:\s*(?:\(|\[)?(?:p\.?|page\s*)(\d{1,5})(?:\)|\])?|\s*\(?(\d{1,5})쪽\)?)\s*$/i,
  );
  if (!m) return { cleaned: text.trim(), page: null };
  const num = Number.parseInt(m[1] || m[2], 10);
  if (!Number.isFinite(num) || num <= 0 || num > 99999) {
    return { cleaned: text.trim(), page: null };
  }
  const cleaned = text.slice(0, m.index).trim();
  return { cleaned: cleaned || text.trim(), page: num };
};

const stripOuterQuotes = (text: string): string => {
  const t = text.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("“") && t.endsWith("”"))
  ) {
    return t.slice(1, -1).trim();
  }
  return t;
};

const stripBulletAndQuotes = (text: string): string => {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•>]|(?:\d+[.)]))\s+/, "").trimEnd());
  return stripOuterQuotes(lines.join("\n"));
};

const splitBookAndAuthor = (
  headerLine: string,
): { bookTitle: string | null; author: string | null } => {
  const clean = headerLine.replace(/^\uFEFF/, "").trim();
  if (!clean) return { bookTitle: null, author: null };
  // Kindle style: "Invisible Cities (Italo Calvino)"
  const m = clean.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (m && m[1].trim()) {
    return { bookTitle: m[1].trim(), author: m[2].trim() || null };
  }
  return { bookTitle: clean, author: null };
};

export const parseKindleClippings = (raw: string): ParsedHighlight[] => {
  const blocks = raw.split(KINDLE_SEP);
  const results: ParsedHighlight[] = [];
  let idx = 0;

  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trimEnd())
      .filter((l, i, arr) => !(i === 0 && !l) && !(i === arr.length - 1 && !l));
    if (lines.length < 3) continue;

    const { bookTitle, author } = splitBookAndAuthor(lines[0]);
    const metaLine = lines[1] ?? "";
    // Skip pure bookmarks with no text
    if (/your bookmark/i.test(metaLine) && lines.slice(2).join("").trim() === "") {
      continue;
    }
    const pageMatch = metaLine.match(/page\s+(\d{1,5})/i);
    const page = pageMatch ? Number.parseInt(pageMatch[1], 10) : null;

    const body = lines.slice(2).join("\n").trim();
    if (!body) continue;

    results.push({
      id: `imp-${idx++}`,
      content: body,
      thoughts: null,
      bookTitle,
      author,
      page: page && page > 0 && page <= 99999 ? page : null,
      format: "kindle",
    });
  }

  return results;
};

export const parseRidiNotes = (raw: string): ParsedHighlight[] => {
  const lines = raw.split(/\r?\n/).map((l) => l.trim());
  const chunks: string[][] = [];
  let current: string[] = [];

  const pushCurrent = () => {
    if (current.length > 0) {
      chunks.push(current);
      current = [];
    }
  };

  for (const line of lines) {
    if (!line) {
      pushCurrent();
      continue;
    }
    if (RIDI_NOISE_LINE.test(line)) {
      continue;
    }
    if (RIDI_DATE_LINE.test(line)) {
      pushCurrent();
      continue;
    }
    current.push(line);
  }
  pushCurrent();

  const results: ParsedHighlight[] = [];
  let idx = 0;
  for (const chunk of chunks) {
    const rawText = stripBulletAndQuotes(chunk.join("\n"));
    if (!rawText || rawText.length < 2) continue;
    const { cleaned, page } = extractTrailingPage(rawText);
    const finalContent = stripOuterQuotes(cleaned);
    if (!finalContent) continue;
    results.push({
      id: `imp-${idx++}`,
      content: finalContent,
      thoughts: null,
      bookTitle: null,
      author: null,
      page,
      format: "ridi",
    });
  }
  return results;
};

export const parseGenericHighlights = (raw: string): ParsedHighlight[] => {
  // Split by horizontal rules (`---`) or 1+ blank lines
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const blocks = normalized
    .split(/(?:\n\s*---+\s*\n|\n{2,})/)
    .map((b) => b.trim())
    .filter(Boolean);

  // If the user pasted single-line bulleted highlights with no blank lines,
  // split per bullet line instead.
  let rawEntries: string[];
  if (blocks.length === 1 && blocks[0].includes("\n")) {
    const lines = blocks[0]
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const bulletLines = lines.filter((l) => /^(?:[-*•>]|\d+[.)])\s+/.test(l));
    rawEntries = bulletLines.length >= 2 ? lines : blocks;
  } else {
    rawEntries = blocks;
  }

  const results: ParsedHighlight[] = [];
  let idx = 0;
  for (const entry of rawEntries) {
    const cleanedEntry = stripBulletAndQuotes(entry);
    if (!cleanedEntry || RIDI_NOISE_LINE.test(cleanedEntry)) continue;
    const { cleaned, page } = extractTrailingPage(cleanedEntry);
    const finalContent = stripOuterQuotes(cleaned);
    if (!finalContent) continue;
    results.push({
      id: `imp-${idx++}`,
      content: finalContent,
      thoughts: null,
      bookTitle: null,
      author: null,
      page,
      format: "generic",
    });
  }
  return results;
};

export const detectHighlightFormat = (raw: string): ImportFormat => {
  if (KINDLE_SEP.test(raw)) return "kindle";
  const lines = raw.split(/\r?\n/).map((l) => l.trim());
  const ridiMarkers = lines.filter(
    (l) => RIDI_DATE_LINE.test(l) || RIDI_NOISE_LINE.test(l),
  ).length;
  if (ridiMarkers >= 1) return "ridi";
  return "generic";
};

export const parseHighlights = (raw: string): ParsedHighlight[] => {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const format = detectHighlightFormat(trimmed);
  if (format === "kindle") return parseKindleClippings(trimmed);
  if (format === "ridi") return parseRidiNotes(trimmed);
  return parseGenericHighlights(trimmed);
};
