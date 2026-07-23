import { Capacitor } from "@capacitor/core";

export type OcrBlock = {
  text: string;
  bbox?: { x: number; y: number; w: number; h: number };
};

export type OcrResult = {
  fullText: string;
  blocks: OcrBlock[];
};

export type OcrInput = {
  /** image source: dataURL (`data:image/...;base64,xxx`) or raw base64 string (no prefix) */
  base64: string;
  /** counter-clockwise rotation in degrees: 0 / 90 / 180 / 270 */
  rotation?: 0 | 90 | 180 | 270;
};

export interface OcrService {
  recognize(input: OcrInput): Promise<OcrResult>;
}

const loadWebOcr = (): Promise<OcrService> =>
  import("./ocr.web").then((m) => m.default);

const loadNativeOcrWithWebFallback = async (): Promise<OcrService> => {
  const native = await import("./ocr.native").then((m) => m.default);
  let webPromise: Promise<OcrService> | null = null;

  return {
    async recognize(input) {
      try {
        return await native.recognize(input);
      } catch (e) {
        const msg = String((e as Error)?.message ?? e);
        const looksUnimplemented =
          /not\s*implemented|UNIMPLEMENTED|not available/i.test(msg);
        if (!looksUnimplemented) throw e;
        console.warn(
          "[ocr] Native OCR plugin not available — falling back to tesseract.js. (",
          msg,
          ")",
        );
        if (!webPromise) webPromise = loadWebOcr();
        const web = await webPromise;
        return web.recognize(input);
      }
    },
  };
};

const nativePluginName = (): string | null => {
  const p = Capacitor.getPlatform();
  if (p === "ios") return "AppleVisionOcr";
  if (p === "android") return "MlKitOcr";
  return null;
};

/**
 * Returns the best OCR implementation for the current runtime.
 *
 * Resolution order:
 *  1. Native iOS (Apple Vision) / Android (ML Kit) when the plugin is registered
 *  2. Otherwise tesseract.js (web / PWA / missing plugin)
 */
export const getOcr = async (): Promise<OcrService> => {
  if (!Capacitor.isNativePlatform()) {
    return loadWebOcr();
  }
  const name = nativePluginName();
  const hasNative = !!name && Capacitor.isPluginAvailable(name);
  console.info(
    `[ocr] platform=${Capacitor.getPlatform()} ` +
      `nativePlugin(${name ?? "none"})=${hasNative ? "AVAILABLE" : "MISSING"} ` +
      `→ engine=${hasNative ? "native (with web fallback)" : "Tesseract/web"}`,
  );
  return hasNative ? loadNativeOcrWithWebFallback() : loadWebOcr();
};

/** Helper: split OCR text into sentence candidates for quick selection. */
export const splitIntoSentences = (text: string): string[] => {
  if (!text) return [];
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const parts = normalized
    .split(/(?<=[.!?。！？…])\s+|(?<=\n)/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [normalized];
};

/** Strip dataURL prefix if present, returning raw base64. */
export const toRawBase64 = (input: string): string => {
  const idx = input.indexOf("base64,");
  return idx >= 0 ? input.slice(idx + "base64,".length) : input;
};
