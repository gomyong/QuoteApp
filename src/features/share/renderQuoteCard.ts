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
 *   - Body text in ExtraLight (weight 200) at a *fixed* 42px at 1080-wide
 *     outputs — glyph size is identical across quotes regardless of
 *     length; longer quotes simply wrap into more lines.
 *   - Narrow body column: 25% margin per side → ~50% canvas width.
 *   - "– Author" / "– Book · Author" in the lower-right corner, Light
 *     (weight 300), smaller than the body.
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
 * Share-card font stack.
 *
 * IMPORTANT: these family names are *different* from the ones the app UI
 * uses in `src/index.css`. The app uses `"Pretendard Variable"` (variable
 * axis via dynamic-subset), but Canvas in iOS WKWebView doesn't reliably
 * trigger dynamic-subset glyph loads and often can't honor intermediate
 * variable weights — it ends up falling back to a system font at Regular,
 * which is exactly the "too thick / too big" look we saw in QA.
 *
 * For the share card we therefore point at dedicated, discrete weight-200
 * font files loaded under share-only family names (`"Pretendard"` static
 * + Google Fonts discrete `"Inter"` / `"Noto Sans JP"` at weight 200).
 * The app UI never references these family+weight combos, so system-level
 * behavior is untouched.
 */
const fontStackFor = (lang: Language): string => {
  switch (lang) {
    case "en":
      return '"Inter", "Pretendard", "Noto Sans JP", system-ui, sans-serif';
    case "ja":
      return '"Noto Sans JP", "Pretendard", "Inter", system-ui, sans-serif';
    case "ko":
    default:
      return '"Pretendard", "Inter", "Noto Sans JP", system-ui, sans-serif';
  }
};

/**
 * Inject (once) a <style> block that registers the exact font files the
 * share card draws with. Kept entirely inside this module so the app's
 * global CSS is untouched.
 *
 * - `Pretendard` (static, weight 200, ExtraLight): one .woff2 file from
 *   the official Pretendard CDN — no unicode-range, no dynamic subset,
 *   so Canvas can rasterize Korean glyphs reliably.
 * - `Inter` / `Noto Sans JP` (weight 200): Google Fonts discrete weight
 *   files pulled via an @import inside the same <style> block.
 * - `Pretendard` / `Inter` / `Noto Sans JP` (weight 300) for attribution.
 *   The app's `index.css` already loads Inter/Noto Sans JP 300 from Google
 *   Fonts, but we re-request them here so we don't rely on the app having
 *   loaded them first.
 *
 * `font-display: block` makes the browser wait briefly instead of flashing
 * fallback glyphs — the Canvas draw only happens after `fonts.ready`
 * resolves anyway.
 */
const SHARE_FONTS_STYLE_ID = "share-card-fonts";
const injectShareFontsOnce = (): void => {
  if (typeof document === "undefined") return;
  if (document.getElementById(SHARE_FONTS_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = SHARE_FONTS_STYLE_ID;
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@200;300&family=Noto+Sans+JP:wght@200;300&display=swap');
    @font-face {
      font-family: 'Pretendard';
      font-weight: 200;
      font-style: normal;
      font-display: block;
      src: url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/woff2/Pretendard-ExtraLight.woff2') format('woff2');
    }
    @font-face {
      font-family: 'Pretendard';
      font-weight: 300;
      font-style: normal;
      font-display: block;
      src: url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/woff2/Pretendard-Light.woff2') format('woff2');
    }
  `;
  document.head.appendChild(style);
};

/**
 * Make sure every glyph we're about to paint is actually available in the
 * font cache before we touch the Canvas. Doing just `document.fonts.load`
 * without a text argument tells the browser "some 200-weight version of
 * this family" — which is enough to start the download but *not* enough to
 * pull in language-specific subsets on CDNs that use unicode-range. We
 * therefore pass the real text through both `fonts.load()` and a tiny
 * hidden DOM node; the DOM render triggers the same font-resolution path
 * the app UI uses, guaranteeing the glyphs are decoded by the time Canvas
 * asks for them.
 */
const ensureFontsReady = async (
  lang: Language,
  bodySize: number,
  bodyText: string,
  attrText: string | null,
): Promise<void> => {
  if (typeof document === "undefined" || !document.fonts) return;
  injectShareFontsOnce();
  const stack = fontStackFor(lang);
  const bodySpec = `200 ${bodySize}px ${stack}`;
  const attrSpec = `300 ${Math.round(bodySize * 0.62)}px ${stack}`;

  // DOM warmup — off-screen node forces the browser to resolve & decode
  // the real glyphs for the exact characters we'll draw.
  const warmup = document.createElement("div");
  warmup.setAttribute("aria-hidden", "true");
  warmup.style.cssText =
    "position:fixed;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none;white-space:pre;";
  const warmBody = document.createElement("div");
  warmBody.style.font = bodySpec;
  warmBody.textContent = bodyText;
  warmup.appendChild(warmBody);
  if (attrText) {
    const warmAttr = document.createElement("div");
    warmAttr.style.font = attrSpec;
    warmAttr.textContent = attrText;
    warmup.appendChild(warmAttr);
  }
  document.body.appendChild(warmup);
  warmup.getBoundingClientRect(); // force layout

  try {
    const tasks: Promise<unknown>[] = [
      document.fonts.load(bodySpec, bodyText),
    ];
    if (attrText) tasks.push(document.fonts.load(attrSpec, attrText));
    await Promise.race([
      Promise.all(tasks),
      new Promise<void>((resolve) => setTimeout(resolve, 3000)),
    ]);
    await document.fonts.ready;
  } catch {
    // best-effort — rendering still proceeds with whatever decoded
  } finally {
    warmup.remove();
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

  // Layout constants — everything is fixed (no length-dependent shrinking).
  //
  //   - Body column inset: 25% per side → ~50% column width at 1080 (540px).
  //   - Body size: 42px at 1080-wide outputs; scales proportionally for
  //     other canvas widths.
  //   - Body weight: 200 (ExtraLight).
  const bodySideInsetRatio = 0.25;
  const BODY_SIZE_PX_AT_1080 = 42;
  const bodySize = Math.round((width / 1080) * BODY_SIZE_PX_AT_1080);
  const BODY_WEIGHT = 200;

  // Attribution — Light 300, right-aligned.
  const margin = Math.round(width * 0.12);
  const attributionBottom = Math.round(height * 0.12);
  const attributionSize = Math.round(width * 0.024); // ~26px at 1080
  const ATTR_WEIGHT = 300;

  // Compose final text up-front so the font warmup can preload every glyph.
  const raw = input.content.trim();
  const body = `\u201C${raw}\u201D`;
  const attribution = formatAttribution(input.bookTitle, input.author);

  await ensureFontsReady(input.lang, bodySize, body, attribution);

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
