import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { defaultArchiveFileName } from "./buildMarkdown";

const toBase64Utf8 = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

/**
 * Share a Markdown file via the system share sheet (native) or download (web).
 */
export const shareMarkdownFile = async (
  markdown: string,
  fileStem?: string,
): Promise<boolean> => {
  const name = `${fileStem ?? defaultArchiveFileName()}.md`;

  if (Capacitor.isNativePlatform()) {
    try {
      await Filesystem.writeFile({
        path: name,
        data: markdown,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      const { uri } = await Filesystem.getUri({
        path: name,
        directory: Directory.Cache,
      });
      await Share.share({
        files: [uri],
        title: name,
        dialogTitle: name,
      });
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message.toLowerCase() : "";
      if (msg.includes("cancel")) return false;
      throw e;
    }
  }

  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const file = new File([blob], name, { type: "text/markdown" });
  const nav = typeof navigator !== "undefined" ? navigator : undefined;

  if (nav && "share" in nav && "canShare" in nav) {
    try {
      const can = (
        nav as Navigator & { canShare?: (d: { files: File[] }) => boolean }
      ).canShare?.({ files: [file] });
      if (can) {
        await (
          nav as Navigator & {
            share: (d: { files: File[]; title?: string }) => Promise<void>;
          }
        ).share({ files: [file], title: name });
        return true;
      }
    } catch {
      /* fall through */
    }
  }

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

/** Copy markdown to clipboard (Notion / Obsidian paste fallback). */
export const copyMarkdownToClipboard = async (
  markdown: string,
): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(markdown);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = markdown;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
};

export { toBase64Utf8 };
