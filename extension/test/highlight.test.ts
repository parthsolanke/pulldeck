import { describe, expect, it } from "vitest";
import { splitHighlightRuns } from "../features/file-tagging/highlight";

describe("splitHighlightRuns", () => {
  it("returns no runs for empty text", () => {
    expect(splitHighlightRuns("", new Set())).toEqual([]);
  });

  it("groups an entirely unmatched string into one run", () => {
    expect(splitHighlightRuns("abc", new Set())).toEqual([
      { text: "abc", matched: false },
    ]);
  });

  it("groups an entirely matched string into one run", () => {
    expect(splitHighlightRuns("abc", new Set([0, 1, 2]))).toEqual([
      { text: "abc", matched: true },
    ]);
  });

  it("splits consecutive matched characters into a single run", () => {
    expect(splitHighlightRuns("aabb", new Set([1, 2]))).toEqual([
      { text: "a", matched: false },
      { text: "ab", matched: true },
      { text: "b", matched: false },
    ]);
  });

  it("handles alternating matches", () => {
    expect(splitHighlightRuns("abcd", new Set([1, 3]))).toEqual([
      { text: "a", matched: false },
      { text: "b", matched: true },
      { text: "c", matched: false },
      { text: "d", matched: true },
    ]);
  });

  it("handles a match at the first character", () => {
    expect(splitHighlightRuns("abc", new Set([0]))).toEqual([
      { text: "a", matched: true },
      { text: "bc", matched: false },
    ]);
  });
});
