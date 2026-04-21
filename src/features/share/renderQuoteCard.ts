/**
 * Renders a shareable quote card to a Canvas and returns a PNG data URL.
 *
 * Why pure Canvas instead of html2canvas?
 *   - html2canvas struggles with webfonts on iOS WKWebView and forces an
 *     extra DOM pass at the exact target DPR. A Canvas2D pipeline gives
 *     us predictable layout, native font rendering via `document.fonts`,
 *     and produces the same bytes on web and iOS.
 *
 * Visual spec follows the reference Einstein card:
 *   - Light off-white background
 *   - Large, slightly condensed body text, centered vertically
 *   - "–Author" or "–Book · Author" in the lower-right corner
 *   - Large outer margins so Instagram crop-safe areas behave
 *
 * The renderer is format-agnostic — callers pass a `ShareSize` describing
 * the target output; currently we ship 1080×1350 (4:5 post) and
 * 1080×1920 (9:16 story).
 */

import type { Language } from "@/i18n/config";

export type ShareSize = {
  id: "post" | "story";
  width: number;
  height: number;
};

export const SHARE_SIZES: ShareSize[] = [
  { id: "post", width: 1080, height: 1350 },
  { id: "story", width: 1080, height: 1920 },
];

export type RenderInput = {
  /** The quote text itself. Newlines are preserved. */
  content: string;
  /** Book title (optional). */
  bookTitle?: string | null;
  /** Author (optional). When both title and author exist we render both. */
  author?: string | null;
  /** Active UI language — chooses the font stack we wait for before drawing. */
  lang: Language;
  /** Target output size. */
  size: ShareSize;
};

/**
 * Font stack priority per language. Must exactly match what we use in the
 * stylesheet (`:lang()` rules in `src/index.css`) so the final rendered
 * glyphs match what the user previewed on screen.
 */
const fontStackFor = (lang: Language): string => {
  switch (lang) {
    case "en":
      return '"Inter", "Pretendard Variable", system-ui, sans-serif';
    case "ja":
      return '"Noto Sans JP", "Pretendard Variable", "Inter", system-ui, sans-serif';
    case "ko":
    default:
      return '"Pretendard Variable", "Pretendard", "Inter", "Noto Sans JP", system-ui, sans-serif';
  }
};

/**
 * Wait for the body font + any of our webfonts we actually use in the
 * drawing to be loaded & ready. Without this the first share after a cold
 * load tends to render in a system fallback font.
 */
const ensureFontsReady = async (lang: Language, bodySize: number): Promise<void> => {
  if (typeof document === "undefined" || !document.fonts) return;
  const stack = fontStackFor(lang);
  // Kick off explicit loads for the sizes we'll actually paint. Browsers
  // short-circuit when the font is already in the cache.
  const tasks = [
    document.fonts.load(`600 ${bodySize}px ${stack}`),
    document.fonts.load(`500 ${Math.round(bodySize * 0.45)}px ${stack}`),
  ];
  try {
    await Promise.race([
      Promise.all(tasks),
      new Promise<void>((resolve) => setTimeout(resolve, 1200)),
    ]);
    await document.fonts.ready;
  } catch {
    // best-effort — rendering still proceeds with whatever fallback
  }
};

/**
 * Greedy word-wrap for canvas. Handles both spaced languages (en/ja
 * western chunks) and dense CJK where we fall back to per-character
 * wrapping when a single "word" exceeds the line budget.
 */
const wrapLines = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] => {
  const paragraphs = text.split(/\r?\n/);
  const out: string[] = [];
  for (const para of paragraphs) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    // First split on whitespace. If a single token is still too wide
    // (common for Japanese without spaces) we wrap per glyph.
    const tokens = para.split(/(\s+)/);
    let line = "";
    const pushLine = () => {
      out.push(line.trim());
      line = "";
    };
    for (const token of tokens) {
      if (token === "") continue;
      const candidate = line + token;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        continue;
      }
      // Token doesn't fit alongside the current line.
      if (line.trim()) pushLine();
      if (ctx.measureText(token).width <= maxWidth) {
        line = token;
        continue;
      }
      // Token is individually too wide — wrap per character.
      for (const ch of token) {
        if (ctx.measureText(line + ch).width > maxWidth) pushLine();
        line += ch;
      }
    }
    if (line.trim()) pushLine();
  }
  return out;
};

/**
 * Iteratively shrink body font size until the wrapped content fits in
 * the available vertical budget. Keeps line-height proportional.
 *
 * Returns the chosen font size, lines and the line-height used.
 */
const fitBodyText = (
  ctx: CanvasRenderingContext2D,
  content: string,
  stack: string,
  maxWidth: number,
  maxHeight: number,
  startSize: number,
  minSize: number,
): { size: number; lines: string[]; lineHeight: number } => {
  let size = startSize;
  while (size >= minSize) {
    ctx.font = `600 ${size}px ${stack}`;
    const lineHeight = Math.round(size * 1.35);
    const lines = wrapLines(ctx, content, maxWidth);
    const totalHeight = lines.length * lineHeight;
    if (totalHeight <= maxHeight) {
      return { size, lines, lineHeight };
    }
    size -= 4;
  }
  // Min size: we still have to paint *something*. Re-measure at minSize
  // and let the caller truncate visually if it overflows.
  ctx.font = `600 ${minSize}px ${stack}`;
  const lines = wrapLines(ctx, content, maxWidth);
  return { size: minSize, lines, lineHeight: Math.round(minSize * 1.35) };
};

/** Build the "– Author" / "– Book · Author" attribution string. */
export const formatAttribution = (
  bookTitle?: string | null,
  author?: string | null,
): string | null => {
  const b = bookTitle?.trim() || "";
  const a = author?.trim() || "";
  if (!b && !a) return null;
  if (b && a) return `– ${a}, ${b}`;
  return `– ${b || a}`;
};

export type RenderedImage = {
  /** `data:image/png;base64,...` */
  dataUrl: string;
  /** Raw base64 without the `data:` prefix — useful for Capacitor Filesystem. */
  base64: string;
  width: number;
  height: number;
};

export const renderQuoteCard = async (
  input: RenderInput,
): Promise<RenderedImage> => {
  const { width, height } = input.size;
  const stack = fontStackFor(input.lang);

  // Palette — kept in-file (not tied to Tailwind tokens) so the final PNG
  // is stable even if the in-app theme changes or the user is currently
  // on dark mode. These mirror the "Navy Mist" reference.
  const BG = "#F4F3F1"; // near-white paper
  const FG = "#1B1B1B"; // ink
  const MUTED = "#5A5A5A"; // subdued byline grey

  // Safe area + layout. The reference card puts the text well inside the
  // visual frame so Instagram's UI overlays don't chew into it.
  const margin = Math.round(width * 0.12);
  const attributionBottom = Math.round(height * 0.12);
  const attributionSize = Math.round(width * 0.03);

  // Load the fonts before we try to measure any text in them.
  await ensureFontsReady(input.lang, Math.round(width * 0.07));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  // Body text
  const contentMaxWidth = width - margin * 2;
  const contentMaxHeight = height - margin * 2 - attributionBottom;
  const startSize = Math.round(width * 0.075); // 1080 → ~81px
  const minSize = Math.round(width * 0.035); // 1080 → ~38px

  const raw = input.content.trim();
  // Wrap content in quote marks to echo the reference card.
  const body = `\u201C${raw}\u201D`;

  const { size: bodySize, lines, lineHeight } = fitBodyText(
    ctx,
    body,
    stack,
    contentMaxWidth,
    contentMaxHeight,
    startSize,
    minSize,
  );

  ctx.fillStyle = FG;
  ctx.font = `600 ${bodySize}px ${stack}`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";

  // Vertically center the block, biased slightly above the geometric
  // center — matches the reference where the attribution sits lower.
  const totalBodyHeight = lines.length * lineHeight;
  const verticalBiasTop = Math.round(height * 0.42);
  const firstBaseline = verticalBiasTop - totalBodyHeight / 2 + lineHeight;

  lines.forEach((line, i) => {
    if (!line) return;
    ctx.fillText(line, width / 2, firstBaseline + i * lineHeight);
  });

  // Attribution (right-aligned, lower-right corner)
  const attribution = formatAttribution(input.bookTitle, input.author);
  if (attribution) {
    ctx.fillStyle = MUTED;
    ctx.font = `500 ${attributionSize}px ${stack}`;
    ctx.textAlign = "right";
    ctx.fillText(attribution, width - margin, height - attributionBottom);
  }

  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return { dataUrl, base64, width, height };
};
