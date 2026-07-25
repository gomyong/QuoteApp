import { Preferences } from "@capacitor/preferences";

const KEY_TOKEN = "quote.pro.notion.token";
const KEY_PARENT = "quote.pro.notion.parent_page_id";

export type NotionConnection = {
  token: string;
  parentPageId: string;
};

export const loadNotionConnection = async (): Promise<NotionConnection> => {
  const [token, parent] = await Promise.all([
    Preferences.get({ key: KEY_TOKEN }),
    Preferences.get({ key: KEY_PARENT }),
  ]);
  return {
    token: (token.value ?? "").trim(),
    parentPageId: (parent.value ?? "").trim(),
  };
};

export const saveNotionConnection = async (
  conn: NotionConnection,
): Promise<void> => {
  await Preferences.set({ key: KEY_TOKEN, value: conn.token.trim() });
  await Preferences.set({
    key: KEY_PARENT,
    value: conn.parentPageId.trim(),
  });
};

export const clearNotionConnection = async (): Promise<void> => {
  await Preferences.remove({ key: KEY_TOKEN });
  await Preferences.remove({ key: KEY_PARENT });
};
