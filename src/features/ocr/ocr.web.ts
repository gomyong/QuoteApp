import type { OcrInput, OcrResult, OcrService } from "./OcrService";

type TesseractWorker = {
  recognize: (image: string) => Promise<{
    data: { text: string; lines?: Array<{ text: string; bbox?: { x0: number; y0: number; x1: number; y1: number } }> };
  }>;
  terminate: () => Promise<void>;
};

let workerPromise: Promise<TesseractWorker> | null = null;

const getWorker = async (): Promise<TesseractWorker> => {
  if (!workerPromise) {
    workerPromise = (async () => {
      const tesseract = await import("tesseract.js");
      // Korean + English. tesseract.js will download lang data on first run.
      const worker = await tesseract.createWorker(["kor", "eng"]);
      return worker as unknown as TesseractWorker;
    })();
  }
  return workerPromise;
};

const ensureDataUrl = (input: string): string => {
  if (input.startsWith("data:")) return input;
  return `data:image/jpeg;base64,${input}`;
};

const webOcr: OcrService = {
  async recognize(input: OcrInput): Promise<OcrResult> {
    const worker = await getWorker();
    const dataUrl = ensureDataUrl(input.base64);
    const result = await worker.recognize(dataUrl);
    const fullText = result?.data?.text ?? "";
    const lines = result?.data?.lines ?? [];
    return {
      fullText,
      blocks: lines.map((l) => ({
        text: l.text?.trim() ?? "",
        bbox: l.bbox
          ? { x: l.bbox.x0, y: l.bbox.y0, w: l.bbox.x1 - l.bbox.x0, h: l.bbox.y1 - l.bbox.y0 }
          : undefined,
      })),
    };
  },
};

export default webOcr;
