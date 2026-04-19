import { Capacitor, registerPlugin } from "@capacitor/core";
import type { OcrInput, OcrResult, OcrService } from "./OcrService";
import { toRawBase64 } from "./OcrService";

/**
 * Native OCR adapter.
 *
 * iOS  → AppleVisionOcr (own in-app plugin, ios/App/App/AppleVisionOcrPlugin.swift)
 *        Uses Apple Vision (`VNRecognizeTextRequest`). Best Korean accuracy on
 *        device, no model download, works offline, 0 MB app size impact.
 *
 * Android → falls through to web (tesseract.js) for now. To get native parity
 *        on Android, add ML Kit Text Recognition Android-side and route here.
 */

type AppleVisionBlock = {
  text: string;
  confidence?: number;
  boundingBox?: { left: number; top: number; right: number; bottom: number };
};

type AppleVisionResult = {
  text: string;
  blocks: AppleVisionBlock[];
};

interface AppleVisionOcrPlugin {
  recognize(opts: {
    base64: string;
    rotation?: number;
    level?: "accurate" | "fast";
    languages?: string[];
  }): Promise<AppleVisionResult>;
  supportedLanguages(): Promise<{ languages: string[] }>;
}

const AppleVisionOcr = registerPlugin<AppleVisionOcrPlugin>("AppleVisionOcr");

const isIos = (): boolean => Capacitor.getPlatform() === "ios";

const nativeOcr: OcrService = {
  async recognize(input: OcrInput): Promise<OcrResult> {
    if (!isIos()) {
      // No bundled Android OCR yet — let the OcrService fallback layer
      // route this to tesseract.js.
      throw new Error("UNIMPLEMENTED: native OCR not available on this platform");
    }

    const base64 = toRawBase64(input.base64);
    console.info("[ocr.native] calling AppleVisionOcr.recognize ...");
    const res = await AppleVisionOcr.recognize({
      base64,
      rotation: input.rotation ?? 0,
      level: "accurate",
      languages: ["ko-KR", "en-US"],
    });
    console.info(
      "[ocr.native] AppleVision returned",
      (res as { engine?: string }).engine,
      `lines=${res.blocks?.length ?? 0}`,
    );

    return {
      fullText: res.text ?? "",
      blocks: (res.blocks ?? []).map((b) => ({
        text: b.text,
        bbox: b.boundingBox
          ? {
              x: b.boundingBox.left,
              y: b.boundingBox.top,
              w: b.boundingBox.right - b.boundingBox.left,
              h: b.boundingBox.bottom - b.boundingBox.top,
            }
          : undefined,
      })),
    };
  },
};

export default nativeOcr;
