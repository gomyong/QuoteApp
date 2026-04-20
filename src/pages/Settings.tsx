import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Image as ImageIcon, LogIn, LogOut, RefreshCw, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/features/auth/AuthProvider";
import { repo } from "@/sync/repo";
import { syncOnce } from "@/sync/syncEngine";

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [storeImages, setStoreImages] = useState(false);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await repo.getSettings();
      setStoreImages(s.storeImages);
      setPending(await repo.outboxSize());
    })();
  }, []);

  const toggleImages = async (next: boolean) => {
    setStoreImages(next);
    await repo.setStoreImages(next);
  };

  const triggerSync = async () => {
    setBusy(true);
    await syncOnce();
    setPending(await repo.outboxSize());
    setBusy(false);
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
            설정
          </motion.h1>
        </div>
      </header>

      {/* Scrollable sections */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-lg mx-auto px-5 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        <section className="glass rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <User size={16} className="text-accent" />
            <span className="text-sm text-foreground">계정</span>
          </div>
          {user ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground truncate">{user.email}</span>
              <button
                onClick={signOut}
                className="text-xs px-3 py-1 rounded-full border border-glass-border/30 hover:bg-glass-border/10 inline-flex items-center gap-1"
              >
                <LogOut size={12} /> 로그아웃
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">로그인하지 않음 (로컬 저장만)</span>
              <button
                onClick={() => navigate("/signin")}
                className="text-xs px-3 py-1 rounded-full bg-accent text-accent-foreground inline-flex items-center gap-1"
              >
                <LogIn size={12} /> 로그인
              </button>
            </div>
          )}
        </section>

        <section className="glass rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ImageIcon size={16} className="text-accent" />
              <div>
                <div className="text-sm text-foreground">원본 이미지 보관</div>
                <div className="text-xs text-muted-foreground">
                  꺼두면 인식 후 원본은 저장하지 않아요
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
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-foreground">동기화</div>
              <div className="text-xs text-muted-foreground">대기 중: {pending}건</div>
            </div>
            <button
              onClick={triggerSync}
              disabled={busy}
              className="text-xs px-3 py-1 rounded-full bg-accent text-accent-foreground inline-flex items-center gap-1 disabled:opacity-60"
            >
              <RefreshCw size={12} className={busy ? "animate-spin" : ""} /> 지금 동기화
            </button>
          </div>
        </section>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Settings;
