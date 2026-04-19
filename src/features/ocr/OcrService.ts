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

// iOS: our in-app Apple Vision plugin (ios/App/App/AppleVisionOcrPlugin.swift).
// Android: no bundled native plugin yet → falls back to tesseract.js.
const NATIVE_PLUGIN_NAME = "AppleVisionOcr";

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
        const looksUnimplemented = /not\s*implemented|UNIMPLEMENTED|not available/i.test(msg);
        if (!looksUnimplemented) throw e;
        console.warn(
          "[ocr] Native ML Kit plugin not available on this platform — " +
            "falling back to tesseract.js. (",
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

/**
 * Returns the best OCR implementation for the current runtime.
 *
 * Resolution order:
 *  1. Native (iOS / Android) with the native OCR plugin actually registered → use it.
 *  2. Native runtime but plugin not registered (e.g. early-startup race where
 *     Capacitor hasn't seen the in-app plugin yet) → wrap the native adapter
 *     so the FIRST call transparently falls back to tesseract.js (web OCR)
 *     instead of throwing "plugin not implemented on ios".
 *  3. Web / PWA / visionOS Safari / Quest browser → tesseract.js directly.
 *
 * NOTE: We intentionally do NOT cache the resolution. In-app plugins on iOS
 * (registered manually from AppDelegate against the bridge) can become
 * available a few hundred ms after first paint. Re-resolving on every call is
 * cheap because the underlying module imports are themselves cached by Vite.
 */
export const getOcr = async (): Promise<OcrService> => {
  if (!Capacitor.isNativePlatform()) {
    return loadWebOcr();
  }
  const hasNative = Capacitor.isPluginAvailable(NATIVE_PLUGIN_NAME);
  console.info(
    `[ocr] platform=${Capacitor.getPlatform()} ` +
      `nativePlugin(${NATIVE_PLUGIN_NAME})=${hasNative ? "AVAILABLE" : "MISSING"} ` +
      `→ engine=${hasNative ? "AppleVision/native (with web fallback)" : "Tesseract/web"}`,
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
