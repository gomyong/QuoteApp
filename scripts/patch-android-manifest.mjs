#!/usr/bin/env node
/**
 * Idempotent AndroidManifest patches for Quote.
 * Run after regenerating `android/` (`npx cap add android`).
 *
 *   node scripts/patch-android-manifest.mjs
 *   npm run android:patch
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MANIFEST = join("android", "app", "src", "main", "AndroidManifest.xml");

if (!existsSync(MANIFEST)) {
  console.error(`[patch-android-manifest] Not found: ${MANIFEST}`);
  console.error("Did you run 'npx cap add android' first?");
  process.exit(1);
}

let xml = readFileSync(MANIFEST, "utf8");
let changed = 0;

const ensurePermission = (name, attrs = "") => {
  if (xml.includes(`android:name="${name}"`)) return;
  const tag = attrs
    ? `    <uses-permission android:name="${name}" ${attrs} />\n`
    : `    <uses-permission android:name="${name}" />\n`;
  if (!xml.includes("</manifest>")) {
    console.error("[patch-android-manifest] malformed manifest");
    process.exit(1);
  }
  xml = xml.replace("</manifest>", `${tag}</manifest>`);
  changed += 1;
};

const ensureCameraFeature = () => {
  if (xml.includes('android.hardware.camera')) return;
  const tag =
    `    <uses-feature\n` +
    `        android:name="android.hardware.camera"\n` +
    `        android:required="false" />\n`;
  xml = xml.replace("</manifest>", `${tag}</manifest>`);
  changed += 1;
};

const ensureAuthDeepLink = () => {
  if (xml.includes('android:scheme="app.quote.note"')) return;
  const filter =
    `\n            <!-- Auth deep link (magic-link / OTP return) -->\n` +
    `            <intent-filter>\n` +
    `                <action android:name="android.intent.action.VIEW" />\n` +
    `                <category android:name="android.intent.category.DEFAULT" />\n` +
    `                <category android:name="android.intent.category.BROWSABLE" />\n` +
    `                <data android:scheme="app.quote.note" android:host="auth" android:pathPrefix="/callback" />\n` +
    `            </intent-filter>\n`;
  // Insert before closing </activity> of MainActivity (first activity).
  xml = xml.replace(
    /(<activity[\s\S]*?android:name="\.MainActivity"[\s\S]*?)(\n\s*<\/activity>)/,
    `$1${filter}$2`,
  );
  if (!xml.includes('android:scheme="app.quote.note"')) {
    console.warn("[patch-android-manifest] could not inject deep-link filter");
    return;
  }
  changed += 1;
};

ensurePermission("android.permission.CAMERA");
ensurePermission("android.permission.READ_MEDIA_IMAGES");
ensurePermission(
  "android.permission.READ_EXTERNAL_STORAGE",
  'android:maxSdkVersion="32"',
);
ensureCameraFeature();
ensureAuthDeepLink();

if (changed === 0) {
  console.log("[patch-android-manifest] already up to date");
} else {
  writeFileSync(MANIFEST, xml);
  console.log(`[patch-android-manifest] applied ${changed} change(s)`);
}
