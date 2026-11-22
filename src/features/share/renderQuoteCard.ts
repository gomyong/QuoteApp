/**
 * Renders a shareable quote card to a Canvas and returns a PNG data URL.
 *
 * Themes harmonize with Quote's serene Flat Navy aesthetic:
 *   - "paper"  Light off-white paper (#F4F3F1) + ink (#1B1B1B)
 *   - "navy"   Deep Midnight Navy (#132247) + crisp off-white (#F4F6FA)
 *   - "dark"   Charcoal Ink (#16171B) + warm paper (#F2F1EE)
 *
 * Supports Sans (ExtraLight/Light Pretendard/Inter) and Serif
 * (Noto Serif KR/JP), optional page attribution, optional user thoughts,
 * and 4:5 (post) or 9:16 (story) output formats.
 */

import type { Language } from "@/i18n/config";

export type ShareSize = {
  id: "post" | "story";
  width: number;
  height: number;
};

export type ShareTheme = "paper" | "navy" | "dark";
export type ShareFontStyle = "sans" | "serif";

export const SHARE_SIZES: ShareSize[] = [
  { id: "post", width: 1080, height: 1350 },
  { id: "story", width: 1080, height: 1920 },
];

export type RenderInput = {
  content: string;
  bookTitle?: string | null;
  author?: string | null;
  thoughts?: string | null;
  includeThoughts?: boolean;
  page?: number | null;
  lang: Language;
  size: ShareSize;
  theme?: ShareTheme;
  fontStyle?: ShareFontStyle;
  showWatermark?: boolean;
};

const fontStackFor = (lang: Language | string, style: ShareFontStyle): string => {
  if (style === "serif") {
    switch (lang) {
      case "ja":
        return '"Noto Serif JP", "Noto Serif KR", Georgia, serif';
      case "en":
        return 'Georgia, "Noto Serif KR", "Noto Serif JP", serif';
      case "ko":
      default:
        return '"Noto Serif KR", "Noto Serif JP", Georgia, serif';
    }
  }
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

const SHARE_FONTS_STYLE_ID = "share-card-fonts";
const injectShareFontsOnce = (): void => {
  if (typeof document === "undefined") return;
  if (document.getElementById(SHARE_FONTS_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = SHARE_FONTS_STYLE_ID;
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@200;300&family=Noto+Sans+JP:wght@200;300&family=Noto+Serif+KR:wght@300;400&family=Noto+Serif+JP:wght@300;400&display=swap');
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

const ensureFontsReady = async (
  lang: Language,
  fontStyle: ShareFontStyle,
  bodySize: number,
  bodyText: string,
  attrText: string | null,
): Promise<void> => {
  if (typeof document === "undefined" || !document.fonts) return;
  injectShareFontsOnce();
  const stack = fontStackFor(lang, fontStyle);
  const weight = fontStyle === "serif" ? 300 : 200;
  const bodySpec = `${weight} ${bodySize}px ${stack}`;
  const attrSpec = `300 ${Math.round(bodySize * 0.62)}px ${stack}`;

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
  warmup.getBoundingClientRect();

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
    /* best-effort */
  } finally {
    warmup.remove();
  }
};

const wrapLines = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] => {
  const CLAUSE_END = /[.,!?;:。、！？；：][\])"'\u201D\u2019]?$/;
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

    let line = "";
    let softLine = "";
    let softTail = "";

    for (const token of tokens) {
      const candidate = line + token;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        if (/\S/.test(token) && CLAUSE_END.test(token)) {
          if (ctx.measureText(line).width >= maxWidth * MIN_SOFT_FILL) {
            softLine = line;
            softTail = "";
          } else if (softLine) {
            softTail += token;
          }
        } else if (softLine) {
          softTail += token;
        }
        continue;
      }

      if (softLine) {
        flush(softLine);
        line = (softTail + token).replace(/^\s+/, "");
        softLine = "";
        softTail = "";
        if (ctx.measureText(line).width <= maxWidth) continue;
      }

      if (line.trim()) flush(line);
      if (ctx.measureText(token).width <= maxWidth) {
        line = token;
      } else {
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

const BODY_SIZE_BASE_AT_1080 = 42;
const SHRINK_SCALES = [1.0, 0.95, 0.9, 0.857] as const;
const TOP_SAFE_RATIO = 0.07;
const BOTTOM_RESERVE_RATIO = 0.14;

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

export const formatSubtitle = (
  bookTitle?: string | null,
  author?: string | null,
  page?: number | null,
): string | null => {
  const b = bookTitle?.trim() || "";
  const a = author?.trim() || "";
  const p = typeof page === "number" && page > 0 ? `p.${page}` : "";
  const parts = [b, a, p].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
};

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
  dataUrl: string;
  base64: string;
  width: number;
  height: number;
  appliedSize: ShareSize;
  appliedBodySize: number;
  wasPromoted: boolean;
  tooLong: boolean;
};

export const renderQuoteCard = async (
  input: RenderInput,
): Promise<RenderedImage> => {
  const theme: ShareTheme = input.theme ?? "paper";
  const fontStyle: ShareFontStyle = input.fontStyle ?? "sans";
  const stack = fontStackFor(input.lang, fontStyle);

  const palette =
    theme === "navy"
      ? { bg: "#132247", fg: "#F4F6FA", muted: "#9AA8C7", lightLogo: true }
      : theme === "dark"
      ? { bg: "#16171B", fg: "#F2F1EE", muted: "#9C9E9F", lightLogo: true }
      : { bg: "#F4F3F1", fg: "#1B1B1B", muted: "#5A5A5A", lightLogo: false };

  const bodySideInsetRatio = 0.23;
  const BODY_WEIGHT = fontStyle === "serif" ? 300 : 200;
  const SUBTITLE_WEIGHT = 300;

  const raw = input.content.trim();
  const body = `\u201C${raw}\u201D`;
  const thoughts =
    input.includeThoughts && input.thoughts?.trim() ? input.thoughts.trim() : null;
  const subtitle = formatSubtitle(input.bookTitle, input.author, input.page);

  const showWatermark = input.showWatermark !== false;
  const logoPromise = showWatermark ? loadLogoOnce() : Promise.resolve(null);
  const warmupSize = Math.round((input.size.width / 1080) * BODY_SIZE_BASE_AT_1080);
  await ensureFontsReady(input.lang, fontStyle, warmupSize, body, subtitle);

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
    thoughtLines: string[];
    thoughtSize: number;
    thoughtLineHeight: number;
    subtitleSize: number;
    subtitleGap: number;
    subtitleBlockHeight: number;
    fits: boolean;
  };

  const computeLayout = (size: ShareSize, scale: number): Layout => {
    const baseBodySize = Math.round((size.width / 1080) * BODY_SIZE_BASE_AT_1080);
    const bodySize = Math.round(baseBodySize * scale);
    const contentMaxWidth = Math.round(size.width * (1 - 2 * bodySideInsetRatio));
    const subtitleSize = Math.round(size.width * 0.026);
    const subtitleGap = Math.round(baseBodySize * 0.9);
    const subtitleBlockHeight = subtitle ? subtitleGap + subtitleSize : 0;

    probeCtx.font = `${BODY_WEIGHT} ${bodySize}px ${stack}`;
    const lineHeight = Math.round(bodySize * 1.55);
    const lines = wrapLines(probeCtx, body, contentMaxWidth);

    const thoughtSize = Math.round(bodySize * 0.72);
    const thoughtLineHeight = Math.round(thoughtSize * 1.52);
    let thoughtLines: string[] = [];
    let thoughtsHeight = 0;
    if (thoughts) {
      probeCtx.font = `300 ${thoughtSize}px ${stack}`;
      thoughtLines = wrapLines(probeCtx, thoughts, contentMaxWidth);
      thoughtsHeight = Math.round(baseBodySize * 0.9) + thoughtLines.length * thoughtLineHeight;
    }

    const maxBodyHeight = getMaxBodyHeight(
      size.height,
      subtitleBlockHeight + thoughtsHeight,
    );
    const fits = lines.length * lineHeight <= maxBodyHeight;

    return {
      bodySize,
      lines,
      lineHeight,
      thoughtLines,
      thoughtSize,
      thoughtLineHeight,
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
    const fallbackSize = sizesToTry[sizesToTry.length - 1];
    const fallbackScale = SHRINK_SCALES[SHRINK_SCALES.length - 1];
    applied = {
      size: fallbackSize,
      layout: computeLayout(fallbackSize, fallbackScale),
    };
    tooLong = true;
  }

  const wasPromoted = applied.size.id !== input.size.id;
  const { width, height } = applied.size;
  const {
    bodySize,
    lines,
    lineHeight,
    thoughtLines,
    thoughtSize,
    thoughtLineHeight,
    subtitleSize,
    subtitleGap,
    subtitleBlockHeight,
  } = applied.layout;

  const logoTargetWidth = Math.round(width * 0.12);
  const logoBottomMargin = Math.round(height * 0.055);
  const logoOpacity = 0.85;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = palette.fg;
  ctx.font = `${BODY_WEIGHT} ${bodySize}px ${stack}`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";

  const totalBodyHeight = lines.length * lineHeight;
  const thoughtsGap = thoughtLines.length > 0 ? Math.round(bodySize * 0.9) : 0;
  const thoughtsHeight =
    thoughtLines.length > 0
      ? thoughtsGap + thoughtLines.length * thoughtLineHeight
      : 0;
  const blockHeight = totalBodyHeight + thoughtsHeight + subtitleBlockHeight;
  const blockCenterY = Math.round(height * 0.45);
  const firstBaseline = blockCenterY - blockHeight / 2 + lineHeight;

  lines.forEach((line, i) => {
    if (!line) return;
    ctx.fillText(line, width / 2, firstBaseline + i * lineHeight);
  });

  let cursorBaseline = firstBaseline + (lines.length - 1) * lineHeight;

  if (thoughtLines.length > 0) {
    cursorBaseline += thoughtsGap;
    ctx.fillStyle = palette.muted;
    ctx.font = `300 ${thoughtSize}px ${stack}`;
    thoughtLines.forEach((tl, i) => {
      if (!tl) return;
      ctx.fillText(tl, width / 2, cursorBaseline + (i + 1) * thoughtLineHeight - thoughtLineHeight * 0.25);
    });
    cursorBaseline += thoughtLines.length * thoughtLineHeight;
  }

  if (subtitle) {
    const subtitleBaseline = cursorBaseline + subtitleGap + subtitleSize;
    ctx.fillStyle = palette.muted;
    ctx.font = `${SUBTITLE_WEIGHT} ${subtitleSize}px ${stack}`;
    ctx.textAlign = "center";
    ctx.fillText(subtitle, width / 2, subtitleBaseline);
  }

  const logo = await logoPromise;
  if (showWatermark) {
    if (palette.lightLogo) {
      ctx.fillStyle = palette.muted;
      ctx.font = `300 28px ${fontStackFor(input.lang, "sans")}`;
      ctx.textAlign = "center";
      ctx.fillText("Quote", width / 2, height - logoBottomMargin - 8);
    } else if (logo && logo.naturalWidth > 0) {
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
