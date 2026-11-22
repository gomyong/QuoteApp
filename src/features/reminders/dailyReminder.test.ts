import { describe, expect, it } from "vitest";
import {
  buildNextTriggerDates,
  buildReminderPlan,
  type ReminderSettings,
} from "./dailyReminder";
import type { Book, Quote } from "@/sync/types";

const makeQuote = (id: string, content: string, isFavorite = false): Quote => ({
  id,
  user_id: null,
  book_id: "b1",
  content,
  thoughts: null,
  page: 42,
  source_image_path: null,
  is_favorite: isFavorite,
  captured_at: "2026-11-20T00:00:00.000Z",
  created_at: "2026-11-20T00:00:00.000Z",
  updated_at: "2026-11-20T00:00:00.000Z",
  deleted_at: null,
});

const book: Book = {
  id: "b1",
  user_id: null,
  title: "보이지 않는 도시들",
  author: "이탈로 칼비노",
  isbn: null,
  cover_url: null,
  created_at: "2026-11-20T00:00:00.000Z",
  updated_at: "2026-11-20T00:00:00.000Z",
};

describe("dailyReminder", () => {
  it("rolls first trigger to tomorrow when today's scheduled time already passed", () => {
    const now = new Date(2026, 10, 22, 10, 30, 0);
    const dates = buildNextTriggerDates(9, 0, 3, now);
    expect(dates).toHaveLength(3);
    expect(dates[0].getDate()).toBe(23);
    expect(dates[0].getHours()).toBe(9);
    expect(dates[2].getDate()).toBe(25);
  });

  it("plans 14 days of notifications and respects favoritesOnly when favorites exist", () => {
    const quotes = [
      makeQuote("q1", "일반 문장입니다.", false),
      makeQuote("q2", "즐겨찾기 문장입니다.", true),
    ];
    const booksById = new Map([[book.id, book]]);
    const settings: ReminderSettings = {
      enabled: true,
      hour: 21,
      minute: 0,
      favoritesOnly: true,
    };
    const now = new Date(2026, 10, 22, 10, 0, 0);
    const plan = buildReminderPlan(quotes, booksById, settings, now);

    expect(plan).toHaveLength(14);
    expect(plan[0].title).toBe("《보이지 않는 도시들》 · 이탈로 칼비노");
    expect(plan.every((p) => p.quoteId === "q2")).toBe(true);
    expect(plan[0].body).toContain("p.42");
  });
});
