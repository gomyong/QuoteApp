import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.quote.note",
  appName: "Quote",
  webDir: "dist",
  ios: {
    // `contentInset: "never"` makes WKWebView cover the *entire* physical
    // screen (edge-to-edge), so there's no black strip below the bottom nav
    // on devices with a home indicator. The price is that we have to handle
    // safe areas ourselves in CSS via `env(safe-area-inset-*)` — which we
    // already do on every page chrome (header/nav padding). Using "always"
    // auto-insets the scrollview for safe areas, which (a) shrinks the
    // webview so the home-indicator region shows through as the window
    // background ("black strip"), and (b) makes `env(safe-area-inset-*)`
    // report 0, collapsing our intentional top breathing room.
    contentInset: "never",
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
      backgroundColor: "#F9F7F7",
      showSpinner: false,
      // Let the splash fade rather than snap-clear if the safety timeout
      // does end up firing.
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
