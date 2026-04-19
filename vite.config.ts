import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
//
// NOTE on bundle splitting:
// We intentionally do NOT use `build.rollupOptions.output.manualChunks` here.
// Manually splitting React (or React-using libs like Radix / framer-motion /
// react-router) into separate chunks frequently breaks ES module evaluation
// order in the iOS WKWebView and surfaces as runtime errors like
// `TypeError: undefined is not an object (evaluating 'b.forwardRef')` or
// `... 'D.createContext'`. Vite/Rollup already do good automatic code-splitting
// at every dynamic `import()` boundary; OCR (tesseract.js), the native OCR
// adapter, and the image picker are all dynamically imported, so they are
// already lazy-loaded into their own chunks.
export default defineConfig(({ mode }) => ({
  base: "./",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react-router-dom", "scheduler"],
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
}));
