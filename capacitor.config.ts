import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.quote.note",
  appName: "Quote",
  webDir: "dist",
  ios: {
    contentInset: "always",
    // Disable WKWebView's rubber-band bounce so the app feels native, not
    // like a webpage. Combined with `overscroll-behavior: none` on the body
    // and `user-scalable=no` in the viewport meta, scrolling/zooming behaves
    // like a regular UIKit app.
    scrollEnabled: false,
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
