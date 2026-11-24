import { describe, expect, it } from "vitest";
import { compileGlobPattern, matchesAnyPattern } from "./glob";

describe("compileGlobPattern", () => {
  it("matches a slash-free pattern at any depth", () => {
    const pattern = compileGlobPattern("*.ts");
    expect(pattern.test("index.ts")).toBe(true);
    expect(pattern.test("src/lib/index.ts")).toBe(true);
    expect(pattern.test("src/index.js")).toBe(false);
  });

  it("anchors patterns that contain a slash", () => {
    const pattern = compileGlobPattern("src/*.ts");
    expect(pattern.test("src/index.ts")).toBe(true);
    expect(pattern.test("lib/src/index.ts")).toBe(false);
  });

  it("escapes regular-expression characters", () => {
    const pattern = compileGlobPattern("a+b.ts");
    expect(pattern.test("a+b.ts")).toBe(true);
    expect(pattern.test("aab.ts")).toBe(false);
  });
});

describe("matchesAnyPattern", () => {
  it("returns true when any pattern matches", () => {
    expect(matchesAnyPattern("src/index.ts", ["*.md", "*.ts"])).toBe(true);
  });

  it("returns false when no pattern matches", () => {
    expect(matchesAnyPattern("src/index.ts", ["*.md", "*.py"])).toBe(false);
  });

  it("returns false for an empty pattern list", () => {
    expect(matchesAnyPattern("src/index.ts", [])).toBe(false);
  });

  it("matches a bare filename nested anywhere", () => {
    expect(matchesAnyPattern("docs/README.md", ["README.md"])).toBe(true);
  });
});
