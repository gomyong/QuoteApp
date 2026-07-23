import { Capacitor, registerPlugin } from "@capacitor/core";
import type { OcrInput, OcrResult, OcrService } from "./OcrService";
import { toRawBase64 } from "./OcrService";

/**
 * Native OCR adapter.
 *
 * iOS  → AppleVisionOcr (ios/App/App/AppleVisionOcrPlugin.swift)
 * Android → MlKitOcr (android/.../MlKitOcrPlugin.java) — Latin + Korean packs
 *
 * Both plugins share the same JS result shape so this file can map either.
 */

type NativeOcrBlock = {
  text: string;
  confidence?: number;
  boundingBox?: { left: number; top: number; right: number; bottom: number };
};

type NativeOcrResult = {
  text: string;
  blocks: NativeOcrBlock[];
  engine?: string;
};

interface NativeOcrPlugin {
  recognize(opts: {
    base64: string;
    rotation?: number;
    level?: "accurate" | "fast";
    languages?: string[];
  }): Promise<NativeOcrResult>;
  supportedLanguages(): Promise<{ languages: string[] }>;
}

const AppleVisionOcr = registerPlugin<NativeOcrPlugin>("AppleVisionOcr");
const MlKitOcr = registerPlugin<NativeOcrPlugin>("MlKitOcr");

const mapResult = (res: NativeOcrResult): OcrResult => ({
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
});

const nativeOcr: OcrService = {
  async recognize(input: OcrInput): Promise<OcrResult> {
    const platform = Capacitor.getPlatform();
    const base64 = toRawBase64(input.base64);
    const opts = {
      base64,
      rotation: input.rotation ?? 0,
      level: "accurate" as const,
      languages: ["ko-KR", "en-US"],
    };

    if (platform === "ios") {
      console.info("[ocr.native] calling AppleVisionOcr.recognize ...");
      const res = await AppleVisionOcr.recognize(opts);
      console.info(
        "[ocr.native] AppleVision returned",
        res.engine,
        `lines=${res.blocks?.length ?? 0}`,
      );
      return mapResult(res);
    }

    if (platform === "android") {
      console.info("[ocr.native] calling MlKitOcr.recognize ...");
      const res = await MlKitOcr.recognize(opts);
      console.info(
        "[ocr.native] MlKit returned",
        res.engine,
        `lines=${res.blocks?.length ?? 0}`,
      );
      return mapResult(res);
    }

    throw new Error("UNIMPLEMENTED: native OCR not available on this platform");
  },
};

export default nativeOcr;
