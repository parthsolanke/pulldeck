import { describe, expect, it } from "vitest";
import { looksBinaryContent } from "./binary-sniff";

describe("looksBinaryContent", () => {
  it("treats ordinary text as text", () => {
    expect(looksBinaryContent("hello world")).toBe(false);
  });

  it("detects a null byte", () => {
    expect(looksBinaryContent("abc\0def")).toBe(true);
  });

  it("detects a Unicode replacement character", () => {
    expect(looksBinaryContent("abc\uFFFDdef")).toBe(true);
  });
});
