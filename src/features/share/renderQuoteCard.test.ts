import { describe, expect, it } from "vitest";
import { formatSubtitle } from "./renderQuoteCard";

describe("formatSubtitle", () => {
  it("joins title, author, and page when present", () => {
    expect(formatSubtitle("보이지 않는 도시들", "이탈로 칼비노", 142)).toBe(
      "보이지 않는 도시들 · 이탈로 칼비노 · p.142",
    );
  });

  it("omits empty parts and zero/null pages", () => {
    expect(formatSubtitle("데미안", null, null)).toBe("데미안");
    expect(formatSubtitle(null, "헤르만 헤세", 0)).toBe("헤르만 헤세");
    expect(formatSubtitle("", "", null)).toBeNull();
  });
});
