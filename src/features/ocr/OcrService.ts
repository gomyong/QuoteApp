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

let cached: Promise<OcrService> | null = null;

/**
 * Returns the best OCR implementation for the current runtime.
 * - Native (iOS / Android) → Apple Vision / ML Kit via Capacitor
 * - Web (PWA, visionOS Safari, Quest browser) → Tesseract.js fallback
 */
export const getOcr = (): Promise<OcrService> => {
  if (!cached) {
    cached = Capacitor.isNativePlatform()
      ? import("./ocr.native").then((m) => m.default)
      : import("./ocr.web").then((m) => m.default);
  }
  return cached;
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
