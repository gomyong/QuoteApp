/**
 * Thin wrapper over Capacitor Share + Filesystem to hand off a PNG to
 * the device's native share sheet, with a clean web fallback.
 *
 * Flow on iOS:
 *   1. Write the PNG into the app's Cache directory.
 *   2. Ask `Filesystem.getUri` for a `file://` URL.
 *   3. Pass that file URL as `files: [...]` to the Share API. iOS then
 *      opens the share sheet and the user can "Save Image", post to
 *      Instagram, AirDrop, etc.
 *
 * On web we fall back to `navigator.share` if it supports files, and
 * finally to a <a download> click so the user at least gets the PNG.
 */

import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export type ShareInput = {
  /** base64 PNG without the `data:` prefix. */
  base64: string;
  /** Full `data:image/png;base64,...` URL for web download fallback. */
  dataUrl: string;
  /** Suggested file name stem (without extension). */
  fileName?: string;
  /** Optional share-sheet title / body text. */
  title?: string;
  /** Optional accompanying text (twitter/email), kept short. */
  text?: string;
};

/**
 * Convert a data URL into a Blob so web fallbacks can hand it to
 * navigator.share or to <a download>.
 */
const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, b64] = dataUrl.split(",");
  const mimeMatch = /data:([^;]+)/.exec(header);
  const mime = mimeMatch?.[1] ?? "image/png";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

/**
 * Share (or download) the PNG. On native, the return value is `true`
 * when the user actually shared (vs cancelled); on web, `true` when we
 * managed to invoke either the Web Share sheet or a download.
 */
export const sharePng = async (input: ShareInput): Promise<boolean> => {
  const name = `${input.fileName ?? "quote"}-${Date.now()}.png`;

  // --- Native path ---------------------------------------------------
  if (Capacitor.isNativePlatform()) {
    try {
      await Filesystem.writeFile({
        path: name,
        data: input.base64,
        directory: Directory.Cache,
        // Writing as binary; Encoding is explicitly *not* UTF-8 because
        // we're handing raw base64 bytes. The plugin treats the absence
        // of Encoding as binary on iOS.
      });
      const { uri } = await Filesystem.getUri({
        path: name,
        directory: Directory.Cache,
      });
      await Share.share({
        files: [uri],
        title: input.title,
        text: input.text,
        dialogTitle: input.title,
      });
      return true;
    } catch (e) {
      // Capacitor throws when the user dismisses the sheet — treat that
      // as a soft-cancel rather than a hard failure.
      const msg = e instanceof Error ? e.message.toLowerCase() : "";
      if (msg.includes("cancel")) return false;
      throw e;
    }
  }

  // --- Web path ------------------------------------------------------
  const blob = dataUrlToBlob(input.dataUrl);
  const file = new File([blob], name, { type: "image/png" });
  const nav = typeof navigator !== "undefined" ? navigator : undefined;

  if (nav && "share" in nav && "canShare" in nav) {
    try {
      const canShareFiles = (nav as Navigator & {
        canShare?: (d: { files: File[] }) => boolean;
      }).canShare?.({ files: [file] });
      if (canShareFiles) {
        await (nav as Navigator & {
          share: (d: { files: File[]; title?: string; text?: string }) => Promise<void>;
        }).share({ files: [file], title: input.title, text: input.text });
        return true;
      }
    } catch {
      /* fall through to download */
    }
  }

  // Final fallback: download the file so the user has *something*.
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
};
