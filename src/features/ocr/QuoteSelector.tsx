import { useEffect, useMemo, useState } from "react";
import { splitIntoSentences, type OcrResult } from "./OcrService";
import { useTranslation } from "@/i18n/LanguageProvider";
import SentenceSelector from "@/components/SentenceSelector";

type Props = {
  result: OcrResult;
  onConfirm: (text: string) => void;
};

const QuoteSelector = ({ result, onConfirm }: Props) => {
  const { t } = useTranslation();
  const sentences = useMemo(
    () => splitIntoSentences(result.fullText),
    [result.fullText],
  );
  const [selected, setSelected] = useState<Set<number>>(() => new Set([0]));

  useEffect(() => {
    setSelected(new Set(sentences.length > 0 ? [0] : []));
  }, [sentences]);

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const joined = useMemo(
    () =>
      Array.from(selected)
        .sort((a, b) => a - b)
        .map((i) => sentences[i])
        .filter(Boolean)
        .join(" ")
        .trim(),
    [selected, sentences],
  );

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        {t("capture.ocr_selector_hint")}
      </div>

      {sentences.length === 0 ? (
        <div className="glass rounded-2xl p-3">
          <div className="text-sm text-muted-foreground p-3">
            {t("capture.ocr_no_sentences")}
          </div>
        </div>
      ) : (
        <SentenceSelector
          sentences={sentences}
          selected={selected}
          onToggle={toggle}
        />
      )}

      <button
        onClick={() => onConfirm(joined)}
        disabled={!joined}
        className="w-full rounded-2xl py-3 bg-accent text-accent-foreground font-medium disabled:opacity-50"
      >
        {t("capture.ocr_use_selected")}
      </button>
    </div>
  );
};

export default QuoteSelector;
