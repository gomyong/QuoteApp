import { Capacitor } from "@capacitor/core";
import { defaultArchiveFileName } from "./buildMarkdown";
import { shareMarkdownFile } from "./shareMarkdownFile";

/** Obsidian / iOS URL schemes reject very long URIs; stay conservative. */
const MAX_URI_CONTENT_CHARS = 1_400;

export type ObsidianExportResult =
  | { status: "opened_uri" }
  | { status: "shared_file" }
  | { status: "cancelled" }
  | { status: "error"; message: string };

/**
 * Open a new note in Obsidian when content fits the URI budget;
 * otherwise fall back to sharing a `.md` file for the user to save into
 * their vault.
 */
export const exportToObsidian = async (
  markdown: string,
  noteName?: string,
): Promise<ObsidianExportResult> => {
  const name = noteName ?? defaultArchiveFileName();
  const encodedName = encodeURIComponent(name);
  const encoded = encodeURIComponent(markdown);

  if (markdown.length <= MAX_URI_CONTENT_CHARS && encoded.length < 6_000) {
    const uri = `obsidian://new?name=${encodedName}&content=${encoded}`;
    try {
      if (Capacitor.isNativePlatform()) {
        window.location.href = uri;
      } else {
        window.open(uri, "_blank", "noopener,noreferrer");
      }
      return { status: "opened_uri" };
    } catch (e) {
      console.warn("[export] obsidian uri failed:", e);
      // fall through to file share
    }
  }

  try {
    const shared = await shareMarkdownFile(markdown, name);
    return shared ? { status: "shared_file" } : { status: "cancelled" };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "obsidian_export_failed",
    };
  }
};
