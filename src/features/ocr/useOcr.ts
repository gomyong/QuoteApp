import { useCallback, useState } from "react";
import { getOcr, type OcrResult } from "./OcrService";

type State = {
  status: "idle" | "running" | "done" | "error";
  result: OcrResult | null;
  error: string | null;
};

export const useOcr = () => {
  const [state, setState] = useState<State>({ status: "idle", result: null, error: null });

  const run = useCallback(async (base64OrDataUrl: string) => {
    setState({ status: "running", result: null, error: null });
    try {
      const ocr = await getOcr();
      const result = await ocr.recognize({ base64: base64OrDataUrl });
      setState({ status: "done", result, error: null });
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : "OCR 실패";
      setState({ status: "error", result: null, error: message });
      return null;
    }
  }, []);

  const reset = useCallback(() => setState({ status: "idle", result: null, error: null }), []);

  return { ...state, run, reset };
};
