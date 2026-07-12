import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n/LanguageProvider";

/**
 * In-app privacy policy (Apple 5.1.1 + App Store Connect URL companion).
 * Hosted HTML twin lives at docs/privacy.html for the public ASC URL.
 */
const Privacy = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="h-dvh bg-background overflow-y-auto overscroll-contain">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-glass-border/15"
            aria-label={t("common.back")}
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-foreground text-lg font-semibold font-display">
            {t("privacy.title")}
          </h1>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] prose-sm text-muted-foreground space-y-4"
      >
        <p className="text-xs text-muted-foreground/80">{t("privacy.updated")}</p>
        <p className="text-sm text-foreground/90">{t("privacy.intro")}</p>

        <section>
          <h2 className="text-sm font-medium text-foreground mb-1">{t("privacy.s1_title")}</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>{t("privacy.s1_email")}</li>
            <li>{t("privacy.s1_content")}</li>
            <li>{t("privacy.s1_photos")}</li>
            <li>{t("privacy.s1_local")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-medium text-foreground mb-1">{t("privacy.s2_title")}</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>{t("privacy.s2_auth")}</li>
            <li>{t("privacy.s2_quotes")}</li>
            <li>{t("privacy.s2_covers")}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-medium text-foreground mb-1">{t("privacy.s3_title")}</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>{t("privacy.s3_supabase")}</li>
            <li>{t("privacy.s3_books")}</li>
          </ul>
          <p className="text-sm mt-2">{t("privacy.s3_no_ads")}</p>
        </section>

        <section>
          <h2 className="text-sm font-medium text-foreground mb-1">{t("privacy.s4_title")}</h2>
          <p className="text-sm">{t("privacy.s4_body")}</p>
        </section>

        <section>
          <h2 className="text-sm font-medium text-foreground mb-1">{t("privacy.s5_title")}</h2>
          <p className="text-sm">
            <a
              className="text-accent underline"
              href="https://github.com/gomyong/QuoteApp/issues"
              target="_blank"
              rel="noreferrer"
            >
              {t("privacy.s5_contact")}
            </a>
          </p>
        </section>
      </motion.main>
    </div>
  );
};

export default Privacy;
