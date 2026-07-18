import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BookMarked,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe,
  Heart,
  Image as ImageIcon,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  User,
  WifiOff,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/features/auth/AuthProvider";
import { repo } from "@/sync/repo";
import { retryMissingCovers } from "@/features/books/useEnsureCovers";
import {
  getSyncStatus,
  retryDeadLetters,
  subscribeSyncStatus,
  syncOnce,
  type SyncStatus,
} from "@/sync/syncEngine";
import { useTranslation } from "@/i18n/LanguageProvider";
import { LANGUAGES, type Language } from "@/i18n/config";
import { SUPPORT_ENABLED, isIapPreviewMode, isTipSheetEnabled } from "@/config/support";
import { TIP_PREVIEW_SETTINGS } from "@/config/tipPreview";
import TipSheet from "@/components/TipSheet";

/** Public support URL (GitHub Pages on QuoteApp). */
const SUPPORT_URL = "https://gomyong.github.io/QuoteApp/#contact";

/** Human-friendly "N minutes ago"-style formatting via i18n keys. */
const useRelativeTime = () => {
  const { t } = useTranslation();
  return (iso: string | null): string => {
    if (!iso) return t("time.never");
    const diffMs = Date.now() - new Date(iso).getTime();
    if (diffMs < 10_000) return t("time.just_now");
    const s = Math.round(diffMs / 1000);
    if (s < 60) return t("time.seconds_ago", { n: s });
    const m = Math.round(s / 60);
    if (m < 60) return t("time.minutes_ago", { n: m });
    const h = Math.round(m / 60);
    if (h < 24) return t("time.hours_ago", { n: h });
    const d = Math.round(h / 24);
    return t("time.days_ago", { n: d });
  };
};

const openExternal = (url: string) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

const Settings = () => {
  const { t, lang, setLanguage } = useTranslation();
  const { user, signOut, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preview = isIapPreviewMode();
  const [storeImages, setStoreImages] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => getSyncStatus());
  const [coverBusy, setCoverBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const formatRelative = useRelativeTime();

  useEffect(() => {
    if (searchParams.get("openTip") === "1") setTipOpen(true);
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      const s = await repo.getSettings();
      setStoreImages(s.storeImages);
    })();
    const unsub = subscribeSyncStatus(setSyncStatus);
    return unsub;
  }, []);

  const toggleImages = async (next: boolean) => {
    setStoreImages(next);
    await repo.setStoreImages(next);
  };

  const triggerSync = async () => {
    setBusy(true);
    await syncOnce();
    setBusy(false);
  };

  const triggerCoverRetry = async () => {
    setCoverBusy(true);
    try {
      await retryMissingCovers();
    } finally {
      setCoverBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    const { error } = await deleteAccount();
    setDeleting(false);
    if (error) {
      setDeleteError(t("settings.delete_account_error"));
      console.warn("[settings] deleteAccount failed:", error);
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      {/* Fixed header */}
      <header className="flex-none bg-background/80 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4">
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-foreground text-2xl font-semibold font-display"
          >
            {t("settings.title")}
          </motion.h1>
        </div>
      </header>

      {/* Scrollable sections */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-lg mx-auto px-5 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        <section className="glass rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <User size={16} className="text-accent" />
            <span className="text-sm text-foreground">{t("settings.account")}</span>
          </div>
          {user ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground truncate">{user.email}</span>
              <button
                onClick={signOut}
                className="text-xs px-3 py-1 rounded-full border border-glass-border/30 hover:bg-glass-border/10 inline-flex items-center gap-1 shrink-0"
              >
                <LogOut size={12} /> {t("settings.sign_out")}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("settings.not_signed_in")}</span>
              <button
                onClick={() => navigate("/signin")}
                className="text-xs px-3 py-1 rounded-full bg-accent text-accent-foreground inline-flex items-center gap-1"
              >
                <LogIn size={12} /> {t("settings.sign_in")}
              </button>
            </div>
          )}
        </section>

        {/* --- Language picker --- */}
        <section className="glass rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <Globe size={16} className="text-accent" />
            <div>
              <div className="text-sm text-foreground">{t("settings.language")}</div>
              <div className="text-xs text-muted-foreground">
                {t("settings.language_desc")}
              </div>
            </div>
          </div>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${LANGUAGES.length}, minmax(0, 1fr))` }}
          >
            {LANGUAGES.map((l) => {
              const active = lang === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => void setLanguage(l.code as Language)}
                  className={`text-xs py-2 rounded-xl transition-colors ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "bg-glass-border/10 text-foreground hover:bg-glass-border/20"
                  }`}
                >
                  {l.nativeLabel}
                </button>
              );
            })}
          </div>
        </section>

        <section className="glass rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ImageIcon size={16} className="text-accent" />
              <div>
                <div className="text-sm text-foreground">{t("settings.store_images")}</div>
                <div className="text-xs text-muted-foreground">
                  {t("settings.store_images_desc")}
                </div>
              </div>
            </div>
            <button
              onClick={() => toggleImages(!storeImages)}
              role="switch"
              aria-checked={storeImages}
              className={`w-11 h-6 rounded-full relative transition-colors ${
                storeImages ? "bg-accent" : "bg-glass-border/40"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-background transition-transform ${
                  storeImages ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </section>

        <section className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {!syncStatus.isOnline ? (
                <WifiOff size={14} className="text-muted-foreground" />
              ) : syncStatus.phase === "error" ? (
                <AlertCircle size={14} className="text-destructive" />
              ) : (
                <CheckCircle2 size={14} className="text-accent" />
              )}
              <span className="text-sm text-foreground">{t("settings.sync")}</span>
            </div>
            <button
              onClick={triggerSync}
              disabled={busy || syncStatus.phase === "pushing" || syncStatus.phase === "pulling"}
              className="text-xs px-3 py-1 rounded-full bg-accent text-accent-foreground inline-flex items-center gap-1 disabled:opacity-60"
            >
              <RefreshCw
                size={12}
                className={
                  busy || syncStatus.phase === "pushing" || syncStatus.phase === "pulling"
                    ? "animate-spin"
                    : ""
                }
              />
              {t("settings.sync_now")}
            </button>
          </div>

          <dl className="text-xs text-muted-foreground space-y-1.5">
            <div className="flex justify-between">
              <dt>{t("settings.sync_network")}</dt>
              <dd className={syncStatus.isOnline ? "text-foreground" : "text-destructive"}>
                {syncStatus.isOnline
                  ? t("settings.sync_online")
                  : t("settings.sync_offline")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("settings.sync_login")}</dt>
              <dd className={user ? "text-foreground" : "text-muted-foreground"}>
                {user ? user.email : t("settings.sync_login_none")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("settings.sync_last")}</dt>
              <dd className="text-foreground">{formatRelative(syncStatus.lastSyncAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("settings.sync_pending")}</dt>
              <dd className="text-foreground">
                {t("settings.sync_pending_count", { count: syncStatus.pendingOutbox })}
              </dd>
            </div>
            {syncStatus.deadLetterCount > 0 && (
              <div className="flex justify-between items-center gap-2">
                <dt className="text-destructive">{t("settings.sync_failed")}</dt>
                <dd className="flex items-center gap-2">
                  <span className="text-destructive">
                    {t("settings.sync_pending_count", {
                      count: syncStatus.deadLetterCount,
                    })}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await retryDeadLetters();
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-full border border-destructive/40 text-destructive"
                  >
                    {t("settings.sync_retry_failed")}
                  </button>
                </dd>
              </div>
            )}
            {(syncStatus.pushed > 0 ||
              syncStatus.pulledQuotes > 0 ||
              syncStatus.pulledBooks > 0) && (
              <div className="flex justify-between">
                <dt>{t("settings.sync_recent")}</dt>
                <dd className="text-foreground">
                  ↑{syncStatus.pushed} ↓{syncStatus.pulledQuotes} ↓{syncStatus.pulledBooks}
                </dd>
              </div>
            )}
            {syncStatus.lastError && (
              <div className="pt-2 mt-2 border-t border-glass-border/20">
                <div className="text-destructive text-[11px] break-words">
                  {syncStatus.lastError}
                </div>
              </div>
            )}
          </dl>
        </section>

        <section className="glass rounded-2xl p-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookMarked size={14} className="text-accent" />
              <span className="text-sm text-foreground">{t("settings.covers")}</span>
            </div>
            <button
              onClick={triggerCoverRetry}
              disabled={coverBusy}
              className="text-xs px-3 py-1 rounded-full bg-accent text-accent-foreground inline-flex items-center gap-1 disabled:opacity-60"
            >
              <RefreshCw size={12} className={coverBusy ? "animate-spin" : ""} />
              {coverBusy ? t("settings.covers_searching") : t("settings.covers_retry")}
            </button>
          </div>
        </section>

        {SUPPORT_ENABLED && (
          <section className="glass rounded-2xl p-4 mt-4">
            <div className="flex items-center gap-3 mb-2">
              <Heart size={16} className="text-accent" />
              <span className="text-sm text-foreground">
                {preview ? TIP_PREVIEW_SETTINGS.title : t("settings.support_dev")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {preview ? TIP_PREVIEW_SETTINGS.description : t("settings.support_dev_desc")}
            </p>
            {isTipSheetEnabled() ? (
              <button
                type="button"
                onClick={() => setTipOpen(true)}
                className="w-full text-sm py-2.5 rounded-xl bg-accent text-accent-foreground inline-flex items-center justify-center gap-1.5"
              >
                <Heart size={14} />
                {preview ? TIP_PREVIEW_SETTINGS.cta : t("settings.support_dev_cta")}
              </button>
            ) : (
              <div className="w-full text-sm py-2.5 rounded-xl bg-glass-border/10 text-muted-foreground inline-flex items-center justify-center gap-1.5">
                {t("settings.support_dev_soon")}
              </div>
            )}
          </section>
        )}

        <TipSheet open={tipOpen} onClose={() => setTipOpen(false)} />

        <section className="glass rounded-2xl p-4 mt-4">
          <div className="flex items-center gap-3 mb-3">
            <FileText size={16} className="text-accent" />
            <span className="text-sm text-foreground">{t("settings.legal")}</span>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => navigate("/privacy")}
              className="w-full text-left text-sm text-foreground py-2 px-1 rounded-lg hover:bg-glass-border/10 flex items-center justify-between"
            >
              {t("settings.privacy")}
              <ExternalLink size={12} className="text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => openExternal(SUPPORT_URL)}
              className="w-full text-left text-sm text-foreground py-2 px-1 rounded-lg hover:bg-glass-border/10 flex items-center justify-between"
            >
              {t("settings.support")}
              <ExternalLink size={12} className="text-muted-foreground" />
            </button>
          </div>
        </section>

        {/* Account deletion — quiet footer, only when signed in */}
        {user && (
          <div className="mt-8 mb-2 flex flex-col items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={deleting}
                  className="text-[11px] text-muted-foreground/70 hover:text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
                >
                  {deleting ? (
                    <span className="inline-flex items-center gap-1.5 no-underline">
                      <Loader2 size={11} className="animate-spin" />
                      {t("settings.delete_account_busy")}
                    </span>
                  ) : (
                    t("settings.delete_account")
                  )}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[min(22rem,calc(100vw-2rem))] rounded-2xl border-glass-border/30 bg-background">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display text-foreground">
                    {t("settings.delete_account_confirm_title")}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    {t("settings.delete_account_confirm_body")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full border-glass-border/30">
                    {t("settings.delete_account_cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      void handleDeleteAccount();
                    }}
                    className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    {t("settings.delete_account_confirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {deleteError && (
              <p className="text-[11px] text-muted-foreground text-center px-4">
                {deleteError}
              </p>
            )}
          </div>
        )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Settings;
