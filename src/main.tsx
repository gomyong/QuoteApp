import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Hide the native splash screen as soon as the React tree mounts so users
// don't have to wait for the default 800ms timeout. Native-only; the dynamic
// import keeps web bundles from pulling in the @capacitor/splash-screen module.
if (Capacitor.isNativePlatform()) {
  void (async () => {
    try {
      const { SplashScreen } = await import("@capacitor/splash-screen");
      await SplashScreen.hide({ fadeOutDuration: 200 });
    } catch (e) {
      console.warn("[splash] failed to hide:", e);
    }
  })();
}
