import type { Comparison } from "./compare";

/** Map a comparison computed for (B, A) back to (A, B). */
export function swapComparison(c: Comparison): Comparison {
  const flip = { a: "b", b: "a", either: "either" } as const;
  return { ...c, a: c.b, b: c.a, picks: c.picks.map((p) => ({ ...p, choice: flip[p.choice] })) };
}
