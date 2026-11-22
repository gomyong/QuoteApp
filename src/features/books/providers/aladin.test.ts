import { describe, expect, it } from "vitest";
import { parseAladinItem } from "./aladin";

describe("parseAladinItem", () => {
  it("strips role annotations from authors, prefers isbn13, and upgrades cover to https", () => {
    const candidate = parseAladinItem(
      {
        itemId: 12345,
        title: "보이지 않는 도시들",
        author: "이탈로 칼비노 (지은이), 이현경 (옮긴이)",
        publisher: "민음사",
        pubDate: "2007-08-20",
        isbn: "8937462780",
        isbn13: "9788937462788",
        cover: "http://image.aladin.co.kr/product/123/cover.jpg",
      },
      "보이지 않는 도시들",
      null,
    );

    expect(candidate.provider).toBe("aladin");
    expect(candidate.authors).toEqual(["이탈로 칼비노", "이현경"]);
    expect(candidate.isbn).toBe("9788937462788");
    expect(candidate.coverUrl).toBe("https://image.aladin.co.kr/product/123/cover.jpg");
    expect(candidate.score).toBeGreaterThan(0.5);
  });
});
