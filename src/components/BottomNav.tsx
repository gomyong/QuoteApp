import { useLocation, useNavigate } from "react-router-dom";
import { Home, PlusCircle, BookOpen, Settings as SettingsIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "@/i18n/LanguageProvider";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navItems = [
    { path: "/", icon: Home, labelKey: "nav.home" as const },
    { path: "/capture", icon: PlusCircle, labelKey: "nav.capture" as const },
    { path: "/library", icon: BookOpen, labelKey: "nav.library" as const },
    { path: "/settings", icon: SettingsIcon, labelKey: "nav.settings" as const },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="glass-subtle px-6 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map(({ path, icon: Icon, labelKey }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-1 py-2 px-4 relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-2 w-6 h-0.5 bg-accent rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  size={20}
                  className={
                    isActive
                      ? "text-accent transition-colors"
                      : "text-muted-foreground transition-colors"
                  }
                />
                <span
                  className={`text-[10px] font-medium ${
                    isActive ? "text-accent" : "text-muted-foreground"
                  }`}
                >
                  {t(labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
