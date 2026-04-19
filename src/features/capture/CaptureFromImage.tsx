import { useState } from "react";
import { Camera, Image as ImageIcon, Loader2, RefreshCcw, X } from "lucide-react";
import { pickImage, type PickedImage } from "@/features/ocr/pickImage";
import { useOcr } from "@/features/ocr/useOcr";
import QuoteSelector from "@/features/ocr/QuoteSelector";

type Props = {
  onConfirm: (text: string, image?: PickedImage) => void;
  onClose: () => void;
};

const CaptureFromImage = ({ onConfirm, onClose }: Props) => {
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
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-lg mx-auto px-5 pt-12 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-foreground text-lg font-semibold">사진으로 기록</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="p-2 rounded-full hover:bg-glass-border/20"
          >
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {!image && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => start("camera")}
              className="glass rounded-2xl py-8 flex flex-col items-center gap-2"
            >
              <Camera size={22} className="text-accent" />
              <span className="text-sm">카메라로 촬영</span>
            </button>
            <button
              onClick={() => start("library")}
              className="glass rounded-2xl py-8 flex flex-col items-center gap-2"
            >
              <ImageIcon size={22} className="text-accent" />
              <span className="text-sm">사진에서 선택</span>
            </button>
          </div>
        )}

        {image && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden glass">
              <img src={image.dataUrl} alt="촬영한 이미지" className="w-full max-h-72 object-contain" />
              <button
                onClick={retake}
                className="absolute top-2 right-2 bg-background/80 text-foreground rounded-full px-3 py-1 text-xs flex items-center gap-1"
              >
                <RefreshCcw size={12} /> 다시
              </button>
            </div>

            {ocr.status === "running" && (
              <div className="glass rounded-2xl p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin text-accent" />
                문장 인식 중…
              </div>
            )}

            {ocr.status === "error" && (
              <div className="glass rounded-2xl p-4 text-sm text-destructive">
                인식 실패: {ocr.error}
                <button
                  onClick={() => ocr.run(image.base64)}
                  className="ml-2 underline text-accent"
                >
                  다시 시도
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
