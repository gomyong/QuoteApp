import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";

const SignIn = () => {
  const { signInWithMagicLink, user } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setErrorMsg(null);
    const { error } = await signInWithMagicLink(email.trim());
    if (error) {
      setStatus("error");
      setErrorMsg(error);
    } else {
      setStatus("sent");
    }
  };

  return (
    <div className="h-dvh bg-background overflow-y-auto overscroll-contain flex items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <h1 className="text-foreground text-2xl font-semibold font-display">로그인</h1>
        <p className="text-muted-foreground text-sm mt-1 mb-8">
          이메일로 매직 링크를 보내드릴게요
        </p>

        {user ? (
          <div className="glass rounded-2xl p-4 text-sm text-foreground">
            이미 로그인되어 있어요: <span className="text-accent">{user.email}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="glass rounded-2xl p-4 flex items-center gap-3">
              <Mail size={16} className="text-accent" />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-medium bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
            >
              {status === "sending" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  보내는 중...
                </>
              ) : (
                <span>매직 링크 보내기</span>
              )}
            </button>

            {status === "sent" && (
              <p className="text-xs text-accent text-center">
                메일함을 확인해 주세요. 링크를 누르면 로그인됩니다.
              </p>
            )}
            {status === "error" && (
              <p className="text-xs text-destructive text-center">
                전송 실패: {errorMsg ?? "잠시 후 다시 시도해 주세요."}
              </p>
            )}
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default SignIn;
