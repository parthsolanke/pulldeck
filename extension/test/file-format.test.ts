import { describe, expect, it } from "vitest";
import {
  getExtension,
  getLanguageTag,
  isBinaryFile,
} from "../features/file-tagging/file-format";

describe("getExtension", () => {
  it("returns the lowercased extension", () => {
    expect(getExtension("src/app.TS")).toBe("ts");
    expect(getExtension("archive.tar.gz")).toBe("gz");
  });

  it("returns the basename when there is no dot", () => {
    expect(getExtension("Makefile")).toBe("makefile");
  });
});

describe("isBinaryFile", () => {
  it("flags known binary extensions regardless of case", () => {
    expect(isBinaryFile("assets/logo.PNG")).toBe(true);
    expect(isBinaryFile("archive.tar.gz")).toBe(true);
    expect(isBinaryFile("build/module.wasm")).toBe(true);
  });

  it("treats source and unknown files as text", () => {
    expect(isBinaryFile("src/index.ts")).toBe(false);
    expect(isBinaryFile("Makefile")).toBe(false);
    expect(isBinaryFile("notes.unknown")).toBe(false);
  });
});

describe("getLanguageTag", () => {
  it("maps known extensions to language tags", () => {
    expect(getLanguageTag("a.ts")).toBe("typescript");
    expect(getLanguageTag("a.TSX")).toBe("tsx");
    expect(getLanguageTag("a.yml")).toBe("yaml");
    expect(getLanguageTag("a.ipynb")).toBe("python");
  });

  it("returns an empty string for unknown or extensionless files", () => {
    expect(getLanguageTag("a.unknown")).toBe("");
    expect(getLanguageTag("Makefile")).toBe("");
  });
});
