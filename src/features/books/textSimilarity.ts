/**
 * Cross-provider text similarity helpers.
 *
 * Extracted from the original `googleBooks.ts` so every adapter can rank
 * results consistently. Bigram Jaccard works well for Korean titles
 * (which lack reliable whitespace tokenization) and short English titles
 * alike — see the inline comments for edge-case rationale.
 */

export const normalize = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[\s\u3000]+/g, " ")
    .replace(/["'“”‘’·,.:;!?\-–—()\[\]{}]/g, "")
    .trim();

/**
 * Character-bigram Jaccard. Returns 0..1.
 *
 * Why bigrams over Levenshtein:
 *   - Korean titles often share the same prefix with edition / subtitle
 *     suffixes ("데미안" vs "데미안 (개정판)"), and bigrams stay high
 *     because most overlapping bigrams are present.
 *   - We don't pay the O(n*m) DP cost — bigram set ops are O(n+m).
 *
 * Special cases:
 *   - Empty strings ⇒ 0.
 *   - Strings shorter than 2 chars ⇒ exact match only (1.0 or 0).
 */
export const similarity = (a: string, b: string): number => {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return x === y ? 1 : 0;
  const toBigrams = (s: string) => {
    const out = new Set<string>();
    for (let i = 0; i < s.length - 1; i += 1) out.add(s.slice(i, i + 2));
    return out;
  };
  const bx = toBigrams(x);
  const by = toBigrams(y);
  let inter = 0;
  bx.forEach((g) => {
    if (by.has(g)) inter += 1;
  });
  return (2 * inter) / (bx.size + by.size);
};

/**
 * Score a candidate book against a query. Same recipe used everywhere:
 *   - title similarity (weight 1.0)
 *   - max author similarity if a query author was supplied (weight 0.5)
 *   - small bonus when the candidate has a cover (so we prefer covered
 *     matches when scores are otherwise tied)
 */
export const scoreCandidate = (
  queryTitle: string,
  queryAuthor: string | null,
  candTitle: string,
  candAuthors: string[],
  hasCover: boolean,
): number => {
  const titleScore = similarity(queryTitle, candTitle);
  const authorScore = queryAuthor
    ? Math.max(0, ...candAuthors.map((a) => similarity(queryAuthor, a)))
    : 0;
  const coverBonus = hasCover ? 0.15 : 0;
  return titleScore * 1.0 + authorScore * 0.5 + coverBonus;
};

/**
 * "Looks contained" check used to accept matches whose bigram score is
 * deceptively low. Catches "데미안" vs "데미안 (개정판)" type pairs.
 */
export const looksContained = (queryTitle: string, candTitle: string): boolean => {
  const q = normalize(queryTitle);
  const c = normalize(candTitle);
  if (!q || !c) return false;
  return c.includes(q) || q.includes(c);
};
