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
 *   - Book title (and author, if both exist) directly below the body,
 *     centered, Light (weight 300), smaller than the body.
 *   - Small, translucent logo watermark at bottom-center.
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
 * Word-wrap for canvas with a light semantic assist.
 *
 * Baseline is still greedy whitespace wrapping (so spaced languages like
 * English / Japanese-with-western-chunks work, and dense CJK falls back
 * to per-character wrapping when a single token exceeds the line
 * budget). On top of that, we track the *last* whitespace-separated
 * token that ended at a clause or sentence boundary — punctuation like
 * `.` `,` `!` `?` `;` `:` and their CJK full-width variants — and
 * prefer to break there when the line would otherwise overflow. This
 * nudges the wrap toward natural "meaning units" instead of chopping a
 * sentence mid-phrase.
 *
 * Knobs:
 *   - `CLAUSE_END`        which tokens count as a candidate soft break.
 *   - `MIN_SOFT_FILL`     fraction of the column a line must already
 *                         occupy before we accept a soft break. Too low
 *                         and we get a ragged stairstep (eager-break on
 *                         the first comma); too high and the heuristic
 *                         rarely fires. 0.4 feels balanced in practice.
 *
 * Lines without any clause-ending punctuation fall straight through to
 * the greedy path — no behavior change for those.
 */
const wrapLines = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] => {
  const CLAUSE_END = /[.,!?;:。、！？；：][\]\)"'\u201D\u2019]?$/;
  const MIN_SOFT_FILL = 0.55;

  const paragraphs = text.split(/\r?\n/);
  const out: string[] = [];

  const flush = (content: string) => {
    const trimmed = content.trim();
    if (trimmed) out.push(trimmed);
  };

  for (const para of paragraphs) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    const tokens = para.split(/(\s+)/).filter((t) => t !== "");

    let line = "";       // content accumulated into the current line
    let softLine = "";   // snapshot of `line` at the last accepted break
    let softTail = "";   // tokens swallowed after the last accepted break

    for (const token of tokens) {
      const candidate = line + token;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        // Promote this boundary to "best soft break" if it's a
        // clause/sentence end and the line already carries enough text.
        if (/\S/.test(token) && CLAUSE_END.test(token)) {
          if (ctx.measureText(line).width >= maxWidth * MIN_SOFT_FILL) {
            softLine = line;
            softTail = "";
          } else if (softLine) {
            // Threshold not met — keep extending the tail we'd carry
            // over if we eventually break at the earlier candidate.
            softTail += token;
          }
        } else if (softLine) {
          softTail += token;
        }
        continue;
      }

      // Overflow — prefer the remembered soft break if we have one.
      if (softLine) {
        flush(softLine);
        line = (softTail + token).replace(/^\s+/, "");
        softLine = "";
        softTail = "";
        if (ctx.measureText(line).width <= maxWidth) continue;
        // Carried content + the new token still don't fit — fall through
        // to the hard-break path below.
      }

      if (line.trim()) flush(line);
      if (ctx.measureText(token).width <= maxWidth) {
        line = token;
      } else {
        // Single token wider than a full column — wrap per glyph.
        line = "";
        for (const ch of token) {
          if (ctx.measureText(line + ch).width > maxWidth) {
            flush(line);
            line = "";
          }
          line += ch;
        }
      }
    }

    if (line.trim()) flush(line);
  }

  return out;
};

/**
 * Base body font size at 1080-wide canvas outputs. The renderer scales
 * this proportionally for other canvas widths (currently 1080 for both
 * share sizes, so effectively a constant in practice).
 */
const BODY_SIZE_BASE_AT_1080 = 42;

/**
 * Soft auto-shrink ladder (Strategy A). For quotes that don't fit on
 * the preferred canvas at the base size, we walk this ladder from
 * largest to smallest and keep the first scale that lets every line
 * fit. 0.857 ≈ 14% smaller than base — small enough that the reader
 * doesn't notice the variation between quotes but still buys a couple
 * of extra lines of breathing room. Going smaller starts to feel
 * anemic for a 200-weight sans at this column width.
 */
const SHRINK_SCALES = [1.0, 0.95, 0.9, 0.857] as const;

/**
 * Visual reservations around the centered text block used to derive
 * the vertical budget for the body (see `getMaxBodyHeight`).
 *   - Top:    7%  — breathing room from the upper edge.
 *   - Bottom: 14% — subtitle gap + watermark + lower air.
 * Chosen empirically so the frame looks balanced at both 4:5 and 9:16.
 */
const TOP_SAFE_RATIO = 0.07;
const BOTTOM_RESERVE_RATIO = 0.14;

/**
 * Max vertical space the body lines may occupy on a given canvas. The
 * text block is centered around 45% of canvas height (see render), so
 * the smaller of (centerY - topSafe) and (bottomEdge - centerY)
 * bounds the half-block. Subtract the subtitle block (if any) since
 * it consumes part of the same budget.
 */
const getMaxBodyHeight = (
  canvasHeight: number,
  subtitleBlockHeight: number,
): number => {
  const blockCenterY = canvasHeight * 0.45;
  const topSafe = canvasHeight * TOP_SAFE_RATIO;
  const bottomReserve = canvasHeight * BOTTOM_RESERVE_RATIO;
  const maxHalfBlock = Math.min(
    blockCenterY - topSafe,
    canvasHeight - bottomReserve - blockCenterY,
  );
  const maxBlockHeight = Math.max(0, maxHalfBlock * 2);
  return Math.max(0, maxBlockHeight - subtitleBlockHeight);
};

/**
 * Build the centered byline shown directly under the quote.
 *
 * Formatting preference:
 *   - Both: "{book title} · {author}"
 *   - Book only: "{book title}"
 *   - Author only: "{author}"
 *   - Neither: null (no byline drawn)
 *
 * Uses a full-width middle dot (" · ") so it renders cleanly in Korean,
 * Japanese, and Latin scripts alike.
 */
export const formatSubtitle = (
  bookTitle?: string | null,
  author?: string | null,
): string | null => {
  const b = bookTitle?.trim() || "";
  const a = author?.trim() || "";
  if (!b && !a) return null;
  if (b && a) return `${b} · ${a}`;
  return b || a;
};

/**
 * Load & cache the wordmark used as a subtle watermark. Resolves to
 * `null` if the fetch/decode fails — rendering still proceeds without a
 * watermark rather than throwing.
 *
 * The asset lives at `./share-watermark.png` (from `public/`), a
 * horizontal grey "Quote" wordmark that's pre-tinted for watermark use
 * (no runtime dimming needed to avoid shouting over the quote). Vite
 * copies it into the build output. We resolve the URL against
 * `document.baseURI` so it works both on capacitor://localhost (iOS),
 * http://localhost (Android) and plain web deployments.
 */
let cachedLogo: HTMLImageElement | null = null;
const loadLogoOnce = async (): Promise<HTMLImageElement | null> => {
  if (typeof document === "undefined") return null;
  if (cachedLogo?.complete && cachedLogo.naturalWidth > 0) return cachedLogo;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const url = new URL("./share-watermark.png", document.baseURI).href;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("logo load failed"));
      img.src = url;
    });
    // `decode()` is advisory but makes the first `drawImage` non-blocking.
    if (typeof img.decode === "function") {
      try {
        await img.decode();
      } catch {
        /* decode is best-effort */
      }
    }
    cachedLogo = img;
    return img;
  } catch {
    return null;
  }
};

export type RenderedImage = {
  /** `data:image/png;base64,...` */
  dataUrl: string;
  /** Raw base64 without the `data:` prefix — useful for Capacitor Filesystem. */
  base64: string;
  width: number;
  height: number;
  /**
   * The canvas size we actually rendered at. Usually equal to
   * `input.size`, but if the quote was too long for the requested size
   * at every allowed font scale, we auto-promote from `post` (4:5) to
   * `story` (9:16) so the text still fits without extreme shrinking.
   */
  appliedSize: ShareSize;
  /** Final body font size in px (after auto-shrink). */
  appliedBodySize: number;
  /** True when `appliedSize.id !== input.size.id` (Strategy B kicked in). */
  wasPromoted: boolean;
  /**
   * True when even the largest allowed canvas at the smallest allowed
   * font scale still overflows. The image is still produced (so the
   * user has something) but the UI should warn that content may clip.
   * Fixed by the upcoming multi-page split (Strategy C — future work).
   */
  tooLong: boolean;
};

export const renderQuoteCard = async (
  input: RenderInput,
): Promise<RenderedImage> => {
  const stack = fontStackFor(input.lang);

  // Palette — kept in-file (not tied to Tailwind tokens) so the final PNG
  // is stable even if the in-app theme changes or the user is currently
  // on dark mode. These mirror the "Navy Mist" reference.
  const BG = "#F4F3F1";    // near-white paper
  const FG = "#1B1B1B";    // ink
  const MUTED = "#5A5A5A"; // subdued byline grey

  //   - Body column inset: 25% per side → ~50% column width at 1080 (540px).
  //   - Body weight: 200 (ExtraLight), subtitle weight 300 (Light).
  const bodySideInsetRatio = 0.25;
  const BODY_WEIGHT = 200;
  const SUBTITLE_WEIGHT = 300;

  const raw = input.content.trim();
  const body = `\u201C${raw}\u201D`;
  const subtitle = formatSubtitle(input.bookTitle, input.author);

  // Kick off logo load + font warmup in parallel. Warmup at the base
  // body size — once a font family/weight is decoded, reuse at any
  // size is effectively free, so this covers both base and shrunk
  // variants we might try below.
  const logoPromise = loadLogoOnce();
  const warmupSize = Math.round((input.size.width / 1080) * BODY_SIZE_BASE_AT_1080);
  await ensureFontsReady(input.lang, warmupSize, body, subtitle);

  // ----- Layout probe (Strategy A + B) --------------------------------
  // Walk scales on the caller's preferred size first. If nothing fits
  // and the preference was `post`, also try `story` (auto-promote).
  // Returned by `computeLayout` so we don't recompute for the real
  // render pass.
  const POST_SIZE = SHARE_SIZES.find((s) => s.id === "post")!;
  const STORY_SIZE = SHARE_SIZES.find((s) => s.id === "story")!;
  const sizesToTry: ShareSize[] =
    input.size.id === "post" ? [POST_SIZE, STORY_SIZE] : [STORY_SIZE];

  const probeCanvas = document.createElement("canvas");
  const probeCtx = probeCanvas.getContext("2d");
  if (!probeCtx) throw new Error("Canvas 2D context unavailable");

  type Layout = {
    bodySize: number;
    lines: string[];
    lineHeight: number;
    subtitleSize: number;
    subtitleGap: number;
    subtitleBlockHeight: number;
    fits: boolean;
  };

  const computeLayout = (size: ShareSize, scale: number): Layout => {
    const baseBodySize = Math.round((size.width / 1080) * BODY_SIZE_BASE_AT_1080);
    const bodySize = Math.round(baseBodySize * scale);
    const contentMaxWidth = Math.round(size.width * (1 - 2 * bodySideInsetRatio));
    // Subtitle sizing is anchored to the *base* body size so the byline
    // doesn't bob up/down between quotes of different body shrink levels.
    const subtitleSize = Math.round(size.width * 0.026);
    const subtitleGap = Math.round(baseBodySize * 0.9);
    const subtitleBlockHeight = subtitle ? subtitleGap + subtitleSize : 0;
    const maxBodyHeight = getMaxBodyHeight(size.height, subtitleBlockHeight);

    probeCtx.font = `${BODY_WEIGHT} ${bodySize}px ${stack}`;
    const lineHeight = Math.round(bodySize * 1.55);
    const lines = wrapLines(probeCtx, body, contentMaxWidth);
    const fits = lines.length * lineHeight <= maxBodyHeight;

    return {
      bodySize,
      lines,
      lineHeight,
      subtitleSize,
      subtitleGap,
      subtitleBlockHeight,
      fits,
    };
  };

  let applied: { size: ShareSize; layout: Layout } | null = null;
  outer: for (const trySize of sizesToTry) {
    for (const scale of SHRINK_SCALES) {
      const layout = computeLayout(trySize, scale);
      if (layout.fits) {
        applied = { size: trySize, layout };
        break outer;
      }
    }
  }

  let tooLong = false;
  if (!applied) {
    // Nothing fit cleanly — render at the biggest canvas we considered
    // using the smallest allowed scale, and flag for UI warning. Clipping
    // is possible; Strategy C (multi-page split) will address this.
    const fallbackSize = sizesToTry[sizesToTry.length - 1];
    const fallbackScale = SHRINK_SCALES[SHRINK_SCALES.length - 1];
    applied = {
      size: fallbackSize,
      layout: computeLayout(fallbackSize, fallbackScale),
    };
    tooLong = true;
  }

  const wasPromoted = applied.size.id !== input.size.id;

  // ----- Actual render -----------------------------------------------
  const { width, height } = applied.size;
  const {
    bodySize,
    lines,
    lineHeight,
    subtitleSize,
    subtitleGap,
    subtitleBlockHeight,
  } = applied.layout;

  // Watermark sizing scales with the chosen canvas size.
  const logoTargetWidth = Math.round(width * 0.12); // ~130px at 1080
  const logoBottomMargin = Math.round(height * 0.055);
  const logoOpacity = 0.85;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = FG;
  ctx.font = `${BODY_WEIGHT} ${bodySize}px ${stack}`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";

  // Vertical composition:
  //   block = body lines + (gap + subtitle?) — centered around ~45% height.
  // We compute the block as a unit so adding/removing the subtitle
  // doesn't shift the body off-center.
  const totalBodyHeight = lines.length * lineHeight;
  const blockHeight = totalBodyHeight + subtitleBlockHeight;
  const blockCenterY = Math.round(height * 0.45);
  const firstBaseline = blockCenterY - blockHeight / 2 + lineHeight;

  lines.forEach((line, i) => {
    if (!line) return;
    ctx.fillText(line, width / 2, firstBaseline + i * lineHeight);
  });

  if (subtitle) {
    const subtitleBaseline =
      firstBaseline + (lines.length - 1) * lineHeight + subtitleGap + subtitleSize;
    ctx.fillStyle = MUTED;
    ctx.font = `${SUBTITLE_WEIGHT} ${subtitleSize}px ${stack}`;
    ctx.textAlign = "center";
    ctx.fillText(subtitle, width / 2, subtitleBaseline);
  }

  const logo = await logoPromise;
  if (logo && logo.naturalWidth > 0) {
    const aspect = logo.naturalHeight / logo.naturalWidth;
    const logoW = logoTargetWidth;
    const logoH = Math.round(logoTargetWidth * aspect);
    const logoX = Math.round((width - logoW) / 2);
    const logoY = height - logoBottomMargin - logoH;
    ctx.save();
    ctx.globalAlpha = logoOpacity;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(logo, logoX, logoY, logoW, logoH);
    ctx.restore();
  }

  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return {
    dataUrl,
    base64,
    width,
    height,
    appliedSize: applied.size,
    appliedBodySize: bodySize,
    wasPromoted,
    tooLong,
  };
};
