import { useState } from "react";
import { Camera, Image as ImageIcon, Loader2, RefreshCcw, X } from "lucide-react";
import { pickImage, type PickedImage } from "@/features/ocr/pickImage";
import { useOcr } from "@/features/ocr/useOcr";
import QuoteSelector from "@/features/ocr/QuoteSelector";
import { useTranslation } from "@/i18n/LanguageProvider";

type Props = {
  onConfirm: (text: string, image?: PickedImage) => void;
  onClose: () => void;
};

const CaptureFromImage = ({ onConfirm, onClose }: Props) => {
  const { t } = useTranslation();
  const [image, setImage] = useState<PickedImage | null>(null);
  const ocr = useOcr();

  const start = async (source: "camera" | "library") => {
    const picked = await pickImage(source);
    if (!picked) return;
    setImage(picked);
    ocr.reset();
    await ocr.run(picked.base64);
  };

  const retake = () => {
    setImage(null);
    ocr.reset();
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

        {!image && (
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

        {image && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden glass">
              <img src={image.dataUrl} alt="" className="w-full max-h-72 object-contain" />
              <button
                onClick={retake}
                className="absolute top-2 right-2 bg-background/80 text-foreground rounded-full px-3 py-1 text-xs flex items-center gap-1"
              >
                <RefreshCcw size={12} /> {t("capture.ocr_retake")}
              </button>
            </div>

            {ocr.status === "running" && (
              <div className="glass rounded-2xl p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin text-accent" />
                {t("capture.ocr_recognizing")}
              </div>
            )}

            {ocr.status === "error" && (
              <div className="glass rounded-2xl p-4 text-sm text-destructive">
                {t("capture.ocr_failed")}: {ocr.error}
                <button
                  onClick={() => ocr.run(image.base64)}
                  className="ml-2 underline text-accent"
                >
                  {t("capture.ocr_retry")}
                </button>
              </div>
            )}

            {ocr.status === "done" && ocr.result && (
              <QuoteSelector
                result={ocr.result}
                onConfirm={(text) => onConfirm(text, image)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CaptureFromImage;
