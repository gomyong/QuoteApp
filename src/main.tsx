import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Hold the brand splash on-screen long enough to register ("Quote" should
// actually be readable), then fade out. We do NOT hide immediately on
// mount — on fast devices the React tree is ready within ~200ms and the
// splash would flash away before the user even registers it.
//
// Total visible time ≈ MIN_VISIBLE_MS + fadeOutDuration.
//
// Native-only; dynamic import keeps @capacitor/splash-screen out of the
// web bundle.
const MIN_VISIBLE_MS = 900;
const FADE_OUT_MS = 400;

if (Capacitor.isNativePlatform()) {
  const mountedAt = performance.now();
  void (async () => {
    try {
      const { SplashScreen } = await import("@capacitor/splash-screen");
      const elapsed = performance.now() - mountedAt;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      await SplashScreen.hide({ fadeOutDuration: FADE_OUT_MS });
    } catch (e) {
      console.warn("[splash] failed to hide:", e);
    }
  })();
}
