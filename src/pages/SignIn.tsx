import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, KeyRound, Loader2, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";

type Step = "email" | "code";

/** Humanize common Supabase auth error messages. */
const prettyError = (raw: string): string => {
  const lc = raw.toLowerCase();
  if (lc.includes("rate limit")) {
    return "메일을 너무 자주 요청했어요. 잠시 후(약 1시간) 다시 시도해 주세요.";
  }
  if (lc.includes("token has expired") || lc.includes("expired")) {
    return "코드가 만료되었어요. 메일을 다시 요청해 주세요.";
  }
  if (lc.includes("invalid") && (lc.includes("token") || lc.includes("otp"))) {
    return "코드가 올바르지 않아요. 다시 확인해 주세요.";
  }
  return raw;
};

const SignIn = () => {
  const { signInWithMagicLink, verifyEmailOtp, user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "verifying" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const codeInputRef = useRef<HTMLInputElement | null>(null);

  // Supabase OTP length is configurable (6 to 10 digits). We accept the
  // full range so the same app works regardless of the project's setting.
  const MIN_CODE_LEN = 6;
  const MAX_CODE_LEN = 10;

  // Jump to home once the session lands (deep link OR OTP code).
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setErrorMsg(null);
    const { error } = await signInWithMagicLink(email.trim());
    if (error) {
      setStatus("error");
      setErrorMsg(prettyError(error));
    } else {
      setStatus("sent");
      setStep("code");
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const token = code.replace(/\D/g, "").slice(0, MAX_CODE_LEN);
    if (token.length < MIN_CODE_LEN) {
      setStatus("error");
      setErrorMsg(`${MIN_CODE_LEN}~${MAX_CODE_LEN}자리 숫자 코드를 입력해 주세요.`);
      return;
    }
    setStatus("verifying");
    setErrorMsg(null);
    const { error } = await verifyEmailOtp(email.trim(), token);
    if (error) {
      setStatus("error");
      setErrorMsg(prettyError(error));
    } else {
      setStatus("idle");
      // onAuthStateChange will flip `user`, and the useEffect above navigates home.
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
          {step === "email"
            ? "이메일로 인증 코드 또는 매직 링크를 보내드릴게요"
            : "메일에 담긴 숫자 코드를 입력하거나 메일 속 링크를 눌러주세요"}
        </p>

        {user ? (
          <div className="glass rounded-2xl p-4 text-sm text-foreground">
            이미 로그인되어 있어요: <span className="text-accent">{user.email}</span>
          </div>
        ) : step === "email" ? (
          <form onSubmit={handleSend} className="space-y-4">
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
              disabled={status === "sending" || !email.trim()}
              className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-medium bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
            >
              {status === "sending" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  보내는 중...
                </>
              ) : (
                <span>코드 / 링크 보내기</span>
              )}
            </button>

            {status === "error" && (
              <p className="text-xs text-destructive text-center">
                {errorMsg ?? "잠시 후 다시 시도해 주세요."}
              </p>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="glass rounded-2xl p-4 flex items-center gap-3">
              <KeyRound size={16} className="text-accent" />
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={MAX_CODE_LEN}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, MAX_CODE_LEN))
                }
                placeholder="인증 코드"
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-lg tracking-[0.3em] font-mono focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={status === "verifying" || code.length < MIN_CODE_LEN}
              className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-medium bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
            >
              {status === "verifying" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  확인하는 중...
                </>
              ) : (
                <span>코드로 로그인</span>
              )}
            </button>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setStatus("idle");
                  setErrorMsg(null);
                }}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <ArrowLeft size={12} /> 이메일 바꾸기
              </button>
              <button
                type="button"
                disabled={status === "sending"}
                onClick={() => void handleSend()}
                className="hover:text-foreground disabled:opacity-60"
              >
                코드 다시 받기
              </button>
            </div>

            {status === "sent" && !errorMsg && (
              <p className="text-xs text-accent text-center">
                메일함을 확인해 주세요. 링크를 눌러도 되고, 코드를 입력해도 됩니다.
              </p>
            )}
            {status === "error" && (
              <p className="text-xs text-destructive text-center">
                {errorMsg ?? "잠시 후 다시 시도해 주세요."}
              </p>
            )}
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default SignIn;
