import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Mic, Type, BookOpen, Tag, Send, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import CaptureFromImage from "@/features/capture/CaptureFromImage";
import type { PickedImage } from "@/features/ocr/pickImage";
import { useAuth } from "@/features/auth/AuthProvider";
import { repo } from "@/sync/repo";
import { syncOnce } from "@/sync/syncEngine";

const Capture = () => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [thoughts, setThoughts] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showOcr, setShowOcr] = useState(false);
  const lastImageRef = useRef<PickedImage | null>(null);

  const handleSave = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      await repo.saveQuote(
        {
          content,
          thoughts,
          book: bookTitle.trim()
            ? { title: bookTitle, author: author || null }
            : null,
          image: lastImageRef.current
            ? { base64: lastImageRef.current.base64, mime: lastImageRef.current.mimeType }
            : null,
        },
        user?.id ?? null,
      );
      lastImageRef.current = null;
      setSaved(true);
      void syncOnce();
      setTimeout(() => {
        setSaved(false);
        setContent("");
        setBookTitle("");
        setAuthor("");
        setThoughts("");
      }, 1400);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="max-w-lg mx-auto px-5 pt-12 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-foreground text-2xl font-semibold font-display">
            기록하기
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            한 줄의 영감을 남겨보세요
          </p>
        </motion.div>

        {/* Input Methods */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3 mb-6"
        >
          {[
            { icon: Camera, label: "사진", onClick: () => setShowOcr(true) },
            { icon: Mic, label: "음성", onClick: () => undefined, disabled: true },
            { icon: Type, label: "직접 입력", onClick: () => undefined },
          ].map(({ icon: Icon, label, onClick, disabled }) => (
            <button
              key={label}
              onClick={onClick}
              disabled={disabled}
              className="flex-1 glass rounded-xl py-3 flex flex-col items-center gap-1.5 hover:bg-glass-border/20 transition-colors active:scale-[0.98] disabled:opacity-50"
            >
              <Icon size={18} className="text-accent" />
              <span className="text-muted-foreground text-xs">{label}</span>
            </button>
          ))}
        </motion.div>

        {/* Quote Input */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="glass rounded-2xl p-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="인상 깊은 문장을 입력하세요..."
              rows={4}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-base leading-relaxed resize-none focus:outline-none"
            />
          </div>

          {/* Book Info */}
          <div className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-accent mb-1">
              <BookOpen size={14} />
              <span className="text-xs font-medium">책 정보</span>
            </div>
            <input
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              placeholder="책 제목"
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none border-b border-border/30 pb-2"
            />
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="저자"
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none"
            />
          </div>

          {/* Thoughts */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 text-accent mb-2">
              <Tag size={14} />
              <span className="text-xs font-medium">나의 생각</span>
            </div>
            <textarea
              value={thoughts}
              onChange={(e) => setThoughts(e.target.value)}
              placeholder="이 문장에 대한 생각을 자유롭게..."
              rows={2}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm leading-relaxed resize-none focus:outline-none"
            />
          </div>

          {/* Save Button */}
          <motion.button
            onClick={handleSave}
            disabled={saving}
            whileTap={{ scale: 0.97 }}
            className={`w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-medium transition-all duration-300 disabled:opacity-70 ${
              saved
                ? "bg-accent/20 text-accent"
                : "bg-accent text-accent-foreground hover:bg-accent/90"
            }`}
          >
            {saved ? (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                ✓ 저장되었어요
              </motion.span>
            ) : saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>저장 중...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>저장하기</span>
              </>
            )}
          </motion.button>
        </motion.div>
      </div>

      <BottomNav />

      {showOcr && (
        <CaptureFromImage
          onClose={() => setShowOcr(false)}
          onConfirm={(text, image) => {
            setContent((prev) => (prev ? `${prev.trim()}\n${text}` : text));
            lastImageRef.current = image ?? null;
            setShowOcr(false);
          }}
        />
      )}
    </div>
  );
};

export default Capture;
