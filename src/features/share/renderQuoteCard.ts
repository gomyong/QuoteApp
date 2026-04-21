/**
 * Renders a shareable quote card to a Canvas and returns a PNG data URL.
 *
 * Why pure Canvas instead of html2canvas?
 *   - html2canvas struggles with webfonts on iOS WKWebView and forces an
 *     extra DOM pass at the exact target DPR. A Canvas2D pipeline gives
 *     us predictable layout, native font rendering via `document.fonts`,
 *     and produces the same bytes on web and iOS.
 *
 * Visual spec:
 *   - Light off-white background
 *   - Body text in an extra-light weight at a *fixed* size (~43px at
 *     1080px-wide outputs), so the glyph size is identical across quotes
 *     regardless of length — longer quotes simply wrap into more lines.
 *   - Narrow body column (~50% of canvas width) so the passage reads as
 *     a compact block of type.
 *   - "– Author" / "– Book · Author" in the lower-right corner, thinner
 *     than the body.
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
 * On-demand stylesheet for the share-card-only weights we need
 * (ExtraLight 200 for Inter / Noto Sans JP). We deliberately do NOT
 * ship these weights in `src/index.css`, because that would pull them
 * into the main app's font payload even though the app's UI never uses
 * them. Instead we inject a `<link rel="stylesheet">` the first time a
 * quote card is rendered; the browser caches it for subsequent shares.
 *
 * Pretendard Variable already supports every weight via a single variable
 * font file, so no extra load is needed for Korean.
 */
const SHARE_FONTS_LINK_ID = "share-card-fonts";
const injectShareFontsOnce = (): void => {
  if (typeof document === "undefined") return;
  if (document.getElementById(SHARE_FONTS_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = SHARE_FONTS_LINK_ID;
  link.rel = "stylesheet";
  // One request for both families, just the ExtraLight weight.
  link.href =
    "https://fonts.googleapis.com/css2?family=Inter:wght@200&family=Noto+Sans+JP:wght@200&display=swap";
  document.head.appendChild(link);
};

/**
 * Wait for the body font + any of our webfonts we actually use in the
 * drawing to be loaded & ready. Without this the first share after a cold
 * load tends to render in a system fallback font.
 */
const ensureFontsReady = async (lang: Language, bodySize: number): Promise<void> => {
  if (typeof document === "undefined" || !document.fonts) return;
  injectShareFontsOnce();
  const stack = fontStackFor(lang);
  // Kick off explicit loads for the exact weights we'll actually paint
  // (ExtraLight body, Light attribution). Browsers short-circuit when the
  // font is already in the cache.
  const tasks = [
    document.fonts.load(`200 ${bodySize}px ${stack}`),
    document.fonts.load(`300 ${Math.round(bodySize * 0.7)}px ${stack}`),
  ];
  try {
    await Promise.race([
      Promise.all(tasks),
      new Promise<void>((resolve) => setTimeout(resolve, 1500)),
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
 * Lay out the body text at a **fixed** font size — no length-dependent
 * shrinking. Long quotes simply wrap into more lines. Returns the lines
 * along with the line-height we'll paint at.
 */
const layoutBody = (
  ctx: CanvasRenderingContext2D,
  content: string,
  stack: string,
  maxWidth: number,
  size: number,
  weight: number,
): { lines: string[]; lineHeight: number } => {
  ctx.font = `${weight} ${size}px ${stack}`;
  const lineHeight = Math.round(size * 1.55);
  const lines = wrapLines(ctx, content, maxWidth);
  return { lines, lineHeight };
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

  // Layout constants — everything is fixed (no auto-shrink).
  //
  // Body column inset: 25% per side → ~50% column width at 1080 (540px).
  //   (user-visible spec is 20–30% margins on each side)
  // Body size: ~43px at 1080 wide outputs; scales proportionally if we
  //   ever render to a different canvas width.
  // Body weight: 200 (ExtraLight) — the thinnest weight we can reliably
  //   serve across Pretendard / Inter / Noto Sans JP.
  const bodySideInsetRatio = 0.25;
  const BODY_SIZE_PX_AT_1080 = 43;
  const bodySize = Math.round((width / 1080) * BODY_SIZE_PX_AT_1080);
  const BODY_WEIGHT = 200;

  // Attribution — thinner than before (Light 300), right-aligned.
  const margin = Math.round(width * 0.12);
  const attributionBottom = Math.round(height * 0.12);
  const attributionSize = Math.round(width * 0.024); // ~26px at 1080
  const ATTR_WEIGHT = 300;

  // Load the fonts before we try to measure any text in them.
  await ensureFontsReady(input.lang, bodySize);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  // Body text
  const contentMaxWidth = Math.round(width * (1 - 2 * bodySideInsetRatio));
  const raw = input.content.trim();
  const body = `\u201C${raw}\u201D`;

  const { lines, lineHeight } = layoutBody(
    ctx,
    body,
    stack,
    contentMaxWidth,
    bodySize,
    BODY_WEIGHT,
  );

  ctx.fillStyle = FG;
  ctx.font = `${BODY_WEIGHT} ${bodySize}px ${stack}`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";

  // Vertically center the block in the upper-middle of the canvas so it
  // sits above the attribution with visual breathing room.
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
    ctx.font = `${ATTR_WEIGHT} ${attributionSize}px ${stack}`;
    ctx.textAlign = "right";
    ctx.fillText(attribution, width - margin, height - attributionBottom);
  }

  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return { dataUrl, base64, width, height };
};
