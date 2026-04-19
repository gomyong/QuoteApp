import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.quote.note",
  appName: "Quote",
  webDir: "dist",
  ios: {
    contentInset: "always",
    // NOTE: Do NOT set `scrollEnabled: false` here — that disables scrolling
    // *entirely*, not just the rubber-band bounce. The native-feel "no
    // bounce" behavior is handled by `overscroll-behavior: none` on the body
    // (see src/index.css) and `touch-action: pan-y`, which keep normal
    // vertical scrolling intact while suppressing the horizontal bounce.
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#1C2431",
      showSpinner: false,
    },
  },
};

export default config;
