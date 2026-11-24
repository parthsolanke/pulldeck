import { describe, expect, it } from "vitest";
import { splitHighlightRuns } from "./highlight";

describe("splitHighlightRuns", () => {
  it("returns an empty array for empty text", () => {
    expect(splitHighlightRuns("", new Set())).toEqual([]);
  });

  it("groups contiguous matched and unmatched characters", () => {
    expect(splitHighlightRuns("abcd", new Set([1, 2]))).toEqual([
      { text: "a", matched: false },
      { text: "bc", matched: true },
      { text: "d", matched: false },
    ]);
  });

  it("splits on non-contiguous matches", () => {
    expect(splitHighlightRuns("abc", new Set([0, 2]))).toEqual([
      { text: "a", matched: true },
      { text: "b", matched: false },
      { text: "c", matched: true },
    ]);
  });

  it("returns a single unmatched run when nothing matches", () => {
    expect(splitHighlightRuns("abc", new Set())).toEqual([{ text: "abc", matched: false }]);
  });

  it("returns a single matched run when everything matches", () => {
    expect(splitHighlightRuns("abc", new Set([0, 1, 2]))).toEqual([
      { text: "abc", matched: true },
    ]);
  });

  it("ignores indexes outside the text", () => {
    expect(splitHighlightRuns("ab", new Set([5]))).toEqual([{ text: "ab", matched: false }]);
  });
});
