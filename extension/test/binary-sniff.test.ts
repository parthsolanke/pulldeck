import { describe, expect, it } from "vitest";
import { looksBinaryContent } from "../lib/binary-sniff";

describe("looksBinaryContent", () => {
  it("treats plain text as non-binary", () => {
    expect(looksBinaryContent("")).toBe(false);
    expect(looksBinaryContent("const x = 1;\n")).toBe(false);
  });

  it("detects a null byte", () => {
    expect(looksBinaryContent(`a${String.fromCharCode(0)}b`)).toBe(true);
  });

  it("detects a Unicode replacement character", () => {
    expect(looksBinaryContent(`a${String.fromCharCode(0xfffd)}b`)).toBe(true);
  });
});
