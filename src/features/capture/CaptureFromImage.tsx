import { useMemo, useState } from "react";
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCcw,
  X,
} from "lucide-react";
import { pickImage, type PickedImage } from "@/features/ocr/pickImage";
import { getOcr, type OcrResult } from "@/features/ocr/OcrService";
import QuoteSelector from "@/features/ocr/QuoteSelector";
import { useTranslation } from "@/i18n/LanguageProvider";

type Props = {
  onConfirm: (text: string, image?: PickedImage) => void;
  onClose: () => void;
};

const CaptureFromImage = ({ onConfirm, onClose }: Props) => {
  const { t } = useTranslation();
  const [pages, setPages] = useState<
    Array<{
      id: string;
      image: PickedImage;
      status: "running" | "done" | "error";
      result: OcrResult | null;
      error: string | null;
    }>
  >([]);

  const isRunning = pages.some((p) => p.status === "running");
  const canAddPage = pages.length < 2 && !isRunning;

  const combinedResult = useMemo<OcrResult | null>(() => {
    const done = pages.filter((p) => p.status === "done" && p.result?.fullText);
    if (done.length === 0) return null;
    return {
      fullText: done.map((p) => p.result?.fullText.trim()).filter(Boolean).join("\n"),
      blocks: done.flatMap((p) => p.result?.blocks ?? []),
    };
  }, [pages]);

  const start = async (source: "camera" | "library") => {
    if (!canAddPage) return;
    const picked = await pickImage(source);
    if (!picked) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setPages((prev) => [
      ...prev,
      { id, image: picked, status: "running", result: null, error: null },
    ]);
    try {
      const ocr = await getOcr();
      const result = await ocr.recognize({ base64: picked.base64 });
      setPages((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: "done", result, error: null } : p,
        ),
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "OCR 실패";
      setPages((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: "error", result: null, error: message } : p,
        ),
      );
    }
  };

  const retryPage = async (pageId: string) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    setPages((prev) =>
      prev.map((p) =>
        p.id === pageId ? { ...p, status: "running", result: null, error: null } : p,
      ),
    );
    try {
      const ocr = await getOcr();
      const result = await ocr.recognize({ base64: page.image.base64 });
      setPages((prev) =>
        prev.map((p) =>
          p.id === pageId ? { ...p, status: "done", result, error: null } : p,
        ),
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "OCR 실패";
      setPages((prev) =>
        prev.map((p) =>
          p.id === pageId ? { ...p, status: "error", result: null, error: message } : p,
        ),
      );
    }
  };

  const removePage = (pageId: string) => {
    setPages((prev) => prev.filter((p) => p.id !== pageId));
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm overflow-y-auto overscroll-contain"
      style={{ touchAction: "manipulation" }}
    >
      <div className="relative z-10 max-w-lg mx-auto px-5 pt-12 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-foreground text-lg font-semibold">{t("capture.ocr_title")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="p-2 rounded-full hover:bg-glass-border/20 cursor-pointer"
            style={{ touchAction: "manipulation" }}
          >
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {pages.length === 0 && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => start("camera")}
              className="glass rounded-2xl py-8 flex flex-col items-center gap-2 cursor-pointer active:scale-[0.98] transition-transform"
              style={{ touchAction: "manipulation" }}
            >
              <Camera size={22} className="text-accent" />
              <span className="text-sm">{t("capture.ocr_from_camera")}</span>
            </button>
            <button
              type="button"
              onClick={() => start("library")}
              className="glass rounded-2xl py-8 flex flex-col items-center gap-2 cursor-pointer active:scale-[0.98] transition-transform"
              style={{ touchAction: "manipulation" }}
            >
              <ImageIcon size={22} className="text-accent" />
              <span className="text-sm">{t("capture.ocr_from_library")}</span>
            </button>
          </div>
        )}

        {pages.length > 0 && (
          <div className="space-y-4">
            <div className="space-y-3">
              {pages.map((page, index) => (
                <div key={page.id} className="relative rounded-2xl overflow-hidden glass">
                  <img
                    src={page.image.dataUrl}
                    alt=""
                    className="w-full max-h-56 object-contain"
                  />
                  <div className="absolute top-2 left-2 bg-background/80 text-foreground rounded-full px-3 py-1 text-xs">
                    {t("capture.ocr_page_label", { n: index + 1 })}
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    {page.status === "error" && (
                      <button
                        onClick={() => retryPage(page.id)}
                        className="bg-background/80 text-foreground rounded-full px-3 py-1 text-xs flex items-center gap-1"
                      >
                        <RefreshCcw size={12} /> {t("capture.ocr_retry")}
                      </button>
                    )}
                    <button
                      onClick={() => removePage(page.id)}
                      className="bg-background/80 text-foreground rounded-full px-3 py-1 text-xs"
                    >
                      {t("capture.ocr_remove_page")}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {isRunning && (
              <div className="glass rounded-2xl p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin text-accent" />
                {t("capture.ocr_recognizing")}
              </div>
            )}

            {pages.some((p) => p.status === "error") && (
              <div className="glass rounded-2xl p-4 text-sm text-destructive space-y-1">
                {pages
                  .filter((p) => p.status === "error")
                  .map((p) => (
                    <div key={p.id}>
                      {t("capture.ocr_page_label", {
                        n: pages.findIndex((page) => page.id === p.id) + 1,
                      })}
                      :{" "}
                      {t("capture.ocr_failed")}
                      {p.error ? ` — ${p.error}` : ""}
                    </div>
                  ))}
              </div>
            )}

            {canAddPage && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => start("camera")}
                  className="glass rounded-2xl py-4 flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-[0.98] transition-transform"
                  style={{ touchAction: "manipulation" }}
                >
                  <Plus size={16} className="text-accent" />
                  {t("capture.ocr_add_camera_page")}
                </button>
                <button
                  type="button"
                  onClick={() => start("library")}
                  className="glass rounded-2xl py-4 flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-[0.98] transition-transform"
                  style={{ touchAction: "manipulation" }}
                >
                  <Plus size={16} className="text-accent" />
                  {t("capture.ocr_add_library_page")}
                </button>
              </div>
            )}

            {combinedResult && (
              <QuoteSelector
                result={combinedResult}
                onConfirm={(text) => onConfirm(text, pages[0]?.image)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CaptureFromImage;
