import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, KeyRound, Loader2, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { useTranslation } from "@/i18n/LanguageProvider";

type Step = "email" | "code";

/**
 * Bucket raw Supabase auth errors into the handful of messages we actually
 * want to surface. Kept here (rather than inline) so the classification is
 * testable and language-agnostic — the caller maps the returned key to a
 * translated string.
 */
type ErrorKey =
  | "signin.error_rate_limit"
  | "signin.error_expired"
  | "signin.error_empty_code"
  | "signin.error_invalid_code"
  | "signin.error_generic";

const classifyError = (raw: string): ErrorKey => {
  const lc = raw.toLowerCase();
  if (lc.includes("rate limit")) return "signin.error_rate_limit";
  if (lc.includes("token has expired") || lc.includes("expired")) {
    return "signin.error_expired";
  }
  if (lc.includes("invalid") && (lc.includes("token") || lc.includes("otp"))) {
    return "signin.error_invalid_code";
  }
  return "signin.error_generic";
};

const SignIn = () => {
  const { t } = useTranslation();
  const { signInWithMagicLink, verifyEmailOtp, user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "verifying" | "sent" | "error">("idle");
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);

  const codeInputRef = useRef<HTMLInputElement | null>(null);

  // Supabase OTP length is project-configurable (typically 6–10 digits).
  // Don't pin a digit count in the UI — just cap input length and let
  // Supabase validate the token the user pasted from their email.
  const MAX_CODE_LEN = 10;

  // Jump to home once the session lands (deep link OR OTP code).
  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setErrorKey(null);
    const { error } = await signInWithMagicLink(email.trim());
    if (error) {
      setStatus("error");
      setErrorKey(classifyError(error));
    } else {
      setStatus("sent");
      setStep("code");
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (status === "verifying") return;
    const token = code.replace(/\D/g, "").slice(0, MAX_CODE_LEN);
    if (!token) {
      setStatus("error");
      setErrorKey("signin.error_empty_code");
      return;
    }
    setStatus("verifying");
    setErrorKey(null);
    const { error } = await verifyEmailOtp(email.trim(), token);
    if (error) {
      setStatus("error");
      setErrorKey(classifyError(error));
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
        <h1 className="text-foreground text-2xl font-semibold font-display">
          {t("signin.title")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1 mb-8">
          {step === "email" ? t("signin.subtitle_email") : t("signin.subtitle_code")}
        </p>

        {user ? (
          <div className="glass rounded-2xl p-4 text-sm text-foreground">
            {t("signin.already_in")} <span className="text-accent">{user.email}</span>
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
                placeholder={t("signin.email_placeholder")}
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
                  {t("signin.sending")}
                </>
              ) : (
                <span>{t("signin.send_code")}</span>
              )}
            </button>

            {status === "error" && (
              <p className="text-xs text-destructive text-center">
                {t(errorKey ?? "signin.error_generic")}
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
                placeholder={t("signin.code_placeholder")}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 text-lg tracking-[0.3em] font-mono focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={status === "verifying" || !code.length}
              className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 font-medium bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
            >
              {status === "verifying" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t("signin.verifying")}
                </>
              ) : (
                <span>{t("signin.verify")}</span>
              )}
            </button>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setStatus("idle");
                  setErrorKey(null);
                }}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <ArrowLeft size={12} /> {t("signin.change_email")}
              </button>
              <button
                type="button"
                disabled={status === "sending"}
                onClick={() => void handleSend()}
                className="hover:text-foreground disabled:opacity-60"
              >
                {t("signin.resend")}
              </button>
            </div>

            {status === "sent" && !errorKey && (
              <p className="text-xs text-accent text-center">
                {t("signin.code_sent")}
              </p>
            )}
            {status === "error" && (
              <p className="text-xs text-destructive text-center">
                {t(errorKey ?? "signin.error_generic")}
              </p>
            )}
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default SignIn;
