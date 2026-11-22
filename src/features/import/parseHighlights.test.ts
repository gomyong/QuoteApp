import { describe, expect, it } from "vitest";
import { parseHighlights } from "./parseHighlights";

describe("parseHighlights", () => {
  it("parses Kindle My Clippings.txt entries with book, author, and page", () => {
    const sample = `
Invisible Cities (Italo Calvino)
- Your Highlight on page 142 | Location 2150-2152 | Added on Friday, November 20, 2026 9:00:00 PM

Cities, like dreams, are made of desires and fears.
==========
Invisible Cities (Italo Calvino)
- Your Bookmark on page 150 | Location 2210 | Added on Friday, November 20, 2026 9:05:00 PM


==========
데미안 (헤르만 헤세)
- Your Highlight on page 12 | Added on Saturday

새는 알에서 나오려고 투쟁한다.
==========
`;
    const parsed = parseHighlights(sample);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      format: "kindle",
      bookTitle: "Invisible Cities",
      author: "Italo Calvino",
      page: 142,
      content: "Cities, like dreams, are made of desires and fears.",
    });
    expect(parsed[1]).toMatchObject({
      format: "kindle",
      bookTitle: "데미안",
      author: "헤르만 헤세",
      page: 12,
      content: "새는 알에서 나오려고 투쟁한다.",
    });
  });

  it("parses Ridi copied reading notes and strips UI noise & dates", () => {
    const sample = `
2026.07.21.
여기서 가장 중요한 키워드는 '선택'입니다.
공유
삭제

2026.07.22 14:30
자연을 이기는 것은 언제나 그 자연스러움이다. (p.88)
삭제
20개 더보기
`;
    const parsed = parseHighlights(sample);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].format).toBe("ridi");
    expect(parsed[0].content).toBe("여기서 가장 중요한 키워드는 '선택'입니다.");
    expect(parsed[1].content).toBe("자연을 이기는 것은 언제나 그 자연스러움이다.");
    expect(parsed[1].page).toBe(88);
  });

  it("parses bulleted or blank-line separated highlights from Millie/Sam/notes", () => {
    const sample = `
- "우리가 읽는 책이 우리 머리를 주먹으로 내리쳐 깨우지 않는다면 왜 책을 읽는가?" (15쪽)
- 상처받지 않고 성장하는 존재는 없다.
`;
    const parsed = parseHighlights(sample);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].format).toBe("generic");
    expect(parsed[0].content).toBe(
      "우리가 읽는 책이 우리 머리를 주먹으로 내리쳐 깨우지 않는다면 왜 책을 읽는가?",
    );
    expect(parsed[0].page).toBe(15);
    expect(parsed[1].content).toBe("상처받지 않고 성장하는 존재는 없다.");
  });
});
