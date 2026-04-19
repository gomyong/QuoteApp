import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { splitIntoSentences, type OcrResult } from "./OcrService";

type Props = {
  result: OcrResult;
  onConfirm: (text: string) => void;
};

const QuoteSelector = ({ result, onConfirm }: Props) => {
  const sentences = useMemo(() => splitIntoSentences(result.fullText), [result.fullText]);
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
      <div className="text-xs text-muted-foreground">기록할 문장을 탭하세요 (여러 개 선택 가능)</div>

      <div className="glass rounded-2xl p-3 max-h-72 overflow-y-auto space-y-2">
        {sentences.length === 0 ? (
          <div className="text-sm text-muted-foreground p-3">인식된 문장이 없어요. 다시 촬영해 주세요.</div>
        ) : (
          sentences.map((s, i) => {
            const isOn = selected.has(i);
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={`w-full text-left px-3 py-2 rounded-xl border transition-colors ${
                  isOn
                    ? "bg-accent/20 border-accent/40 text-foreground"
                    : "border-glass-border/30 text-muted-foreground hover:bg-glass-border/10"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                      isOn ? "bg-accent border-accent text-accent-foreground" : "border-muted-foreground/40"
                    }`}
                  >
                    {isOn && <Check size={10} />}
                  </span>
                  <span className="text-sm leading-relaxed">{s}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      <button
        onClick={() => onConfirm(joined)}
        disabled={!joined}
        className="w-full rounded-2xl py-3 bg-accent text-accent-foreground font-medium disabled:opacity-50"
      >
        선택한 문장 사용하기
      </button>
    </div>
  );
};

export default QuoteSelector;
