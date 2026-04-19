#!/usr/bin/env node
/**
 * Patch ios/App/App/Info.plist to add iOS permission usage strings.
 * Idempotent: existing keys are preserved (their values are NOT overwritten).
 *
 * Run after `npx cap add ios` (or any time you regenerate the iOS project).
 *
 *   node scripts/patch-ios-info-plist.mjs
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PLIST_PATH = join("ios", "App", "App", "Info.plist");

const REQUIRED = {
  NSCameraUsageDescription: "책의 문장을 촬영해 빠르게 기록하기 위해 사용합니다.",
  NSPhotoLibraryUsageDescription: "저장된 책 사진에서 문장을 인식하기 위해 사용합니다.",
  NSPhotoLibraryAddUsageDescription: "기록한 사진을 사진첩에 저장할 수 있도록 사용합니다.",
};

if (!existsSync(PLIST_PATH)) {
  console.error(`[patch-ios-info-plist] Not found: ${PLIST_PATH}`);
  console.error("Did you run 'npx cap add ios' first?");
  process.exit(1);
}

let xml = readFileSync(PLIST_PATH, "utf8");
let added = 0;

for (const [key, value] of Object.entries(REQUIRED)) {
  if (xml.includes(`<key>${key}</key>`)) continue;
  const inject = `\t<key>${key}</key>\n\t<string>${value}</string>\n`;
  xml = xml.replace(/<\/dict>\s*<\/plist>\s*$/m, `${inject}</dict>\n</plist>\n`);
  added += 1;
}

if (added === 0) {
  console.log("[patch-ios-info-plist] All required keys already present. No changes.");
} else {
  writeFileSync(PLIST_PATH, xml);
  console.log(`[patch-ios-info-plist] Added ${added} key(s) to ${PLIST_PATH}`);
}
