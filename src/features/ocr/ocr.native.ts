import { CapacitorPluginMlKitTextRecognition } from "@pantrist/capacitor-plugin-ml-kit-text-recognition";
import type { OcrInput, OcrResult, OcrService } from "./OcrService";
import { toRawBase64 } from "./OcrService";

const nativeOcr: OcrService = {
  async recognize(input: OcrInput): Promise<OcrResult> {
    const base64 = toRawBase64(input.base64);
    const res = await CapacitorPluginMlKitTextRecognition.detectText({
      base64Image: base64,
      rotation: input.rotation ?? 0,
    });

    const blocks = (res.blocks ?? []).map((b) => ({
      text: b.text,
      bbox: b.boundingBox
        ? {
            x: b.boundingBox.left,
            y: b.boundingBox.top,
            w: b.boundingBox.right - b.boundingBox.left,
            h: b.boundingBox.bottom - b.boundingBox.top,
          }
        : undefined,
    }));

    return {
      fullText: res.text ?? "",
      blocks,
    };
  },
};

export default nativeOcr;
