import { describe, expect, it } from "vitest";
import { buildWidgetSnapshot } from "./widgetBridge";
import type { Book, Quote } from "@/sync/types";

describe("buildWidgetSnapshot", () => {
  it("builds dailyQuote and recentQuotes excluding soft-deleted entries", () => {
    const books: Book[] = [
      {
        id: "b1",
        user_id: null,
        title: "데미안",
        author: "헤르만 헤세",
        isbn: null,
        cover_url: null,
        created_at: "2026-11-20T00:00:00.000Z",
        updated_at: "2026-11-20T00:00:00.000Z",
      },
    ];
    const quotes: Quote[] = [
      {
        id: "q1",
        user_id: null,
        book_id: "b1",
        content: "새는 알에서 나오려고 투쟁한다.",
        thoughts: null,
        page: 12,
        source_image_path: null,
        is_favorite: true,
        captured_at: "2026-11-20T00:00:00.000Z",
        created_at: "2026-11-20T00:00:00.000Z",
        updated_at: "2026-11-20T00:00:00.000Z",
        deleted_at: null,
      },
      {
        id: "q2",
        user_id: null,
        book_id: "b1",
        content: "삭제된 문장",
        thoughts: null,
        page: null,
        source_image_path: null,
        is_favorite: false,
        captured_at: "2026-11-20T00:00:00.000Z",
        created_at: "2026-11-20T00:00:00.000Z",
        updated_at: "2026-11-20T00:00:00.000Z",
        deleted_at: "2026-11-21T00:00:00.000Z",
      },
    ];

    const snap = buildWidgetSnapshot(quotes, books, new Date(2026, 10, 22));
    expect(snap.totalQuotes).toBe(1);
    expect(snap.totalBooks).toBe(1);
    expect(snap.dailyQuote?.bookTitle).toBe("데미안");
    expect(snap.dailyQuote?.page).toBe(12);
    expect(snap.recentQuotes).toHaveLength(1);
  });
});
