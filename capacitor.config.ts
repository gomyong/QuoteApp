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
    //
    // `limitsNavigationsToAppBoundDomains` was removed intentionally — when
    // paired with a `WKAppBoundDomains` Info.plist entry it sandboxes the
    // WebView to a tiny allowlist, which would block our Google Books cover
    // lookups (https://www.googleapis.com/books/v1/volumes) and any future
    // third-party APIs. Standard ATS still protects non-https traffic.
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      // Keep the native splash up until our JS explicitly dismisses it in
      // src/main.tsx (the visible duration is capped there via MIN_VISIBLE_MS
      // + fadeOutDuration). `launchShowDuration` is a *safety* timeout: if
      // the web layer never calls hide() we still clear the splash after 3s
      // so the user isn't stuck staring at the logo.
      launchShowDuration: 3000,
      launchAutoHide: false,
      backgroundColor: "#1C2431",
      showSpinner: false,
      // Let the splash fade rather than snap-clear if the safety timeout
      // does end up firing.
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
