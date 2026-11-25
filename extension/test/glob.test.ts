import { describe, expect, it } from "vitest";
import { compileGlobPattern, matchesAnyPattern } from "../lib/glob";

describe("compileGlobPattern", () => {
  it("matches a slash-free pattern at any depth", () => {
    const re = compileGlobPattern("*.ts");
    expect(re.test("index.ts")).toBe(true);
    expect(re.test("src/index.ts")).toBe(true);
    expect(re.test("src/deep/index.ts")).toBe(true);
    expect(re.test("index.js")).toBe(false);
  });

  it("anchors a pattern containing a slash literally", () => {
    const re = compileGlobPattern("src/*.ts");
    expect(re.test("src/index.ts")).toBe(true);
    expect(re.test("src/deep/index.ts")).toBe(true);
    expect(re.test("other/src/index.ts")).toBe(false);
    expect(re.test("index.ts")).toBe(false);
  });

  it("treats regex metacharacters literally", () => {
    const re = compileGlobPattern("file(1).ts");
    expect(re.test("file(1).ts")).toBe(true);
    expect(re.test("file1.ts")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(compileGlobPattern("*.ts").test("Index.TS")).toBe(false);
  });
});

describe("matchesAnyPattern", () => {
  it("returns true when any pattern matches", () => {
    expect(matchesAnyPattern("src/index.ts", ["*.js", "*.ts"])).toBe(true);
  });

  it("returns false when no pattern matches", () => {
    expect(matchesAnyPattern("src/index.ts", ["*.js", "*.css"])).toBe(false);
    expect(matchesAnyPattern("src/index.ts", [])).toBe(false);
  });
});
