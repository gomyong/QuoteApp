import { describe, expect, it } from "vitest";
import { buildQuotesMarkdown } from "./buildMarkdown";
import type { Book, Quote } from "@/sync/types";

const q = (partial: Partial<Quote> & Pick<Quote, "id" | "content">): Quote => ({
  user_id: null,
  book_id: null,
  thoughts: null,
  page: null,
  source_image_path: null,
  is_favorite: false,
  captured_at: "2026-07-25T00:00:00.000Z",
  created_at: "2026-07-25T00:00:00.000Z",
  updated_at: "2026-07-25T00:00:00.000Z",
  deleted_at: null,
  ...partial,
});

describe("buildQuotesMarkdown", () => {
  it("groups by book and includes thoughts/page", () => {
    const book: Book = {
      id: "b1",
      user_id: null,
      title: "데미안",
      author: "헤르만 헤세",
      isbn: null,
      cover_url: null,
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-01T00:00:00.000Z",
    };
    const md = buildQuotesMarkdown(
      [
        q({
          id: "1",
          book_id: "b1",
          content: "새는 알을 깨고 나온다",
          page: 12,
          thoughts: "성장",
        }),
        q({ id: "2", content: "혼자 남긴 문장" }),
      ],
      new Map([["b1", book]]),
    );
    expect(md).toContain("## 데미안");
    expect(md).toContain("헤르만 헤세");
    expect(md).toContain("새는 알을 깨고 나온다");
    expect(md).toContain("p.12");
    expect(md).toContain("성장");
    expect(md).toContain("## Unassigned");
    expect(md).toContain("혼자 남긴 문장");
  });
});
