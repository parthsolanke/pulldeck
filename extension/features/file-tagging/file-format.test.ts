import { describe, expect, it } from "vitest";
import { getExtension, getLanguageTag, isBinaryFile } from "./file-format";

describe("getExtension", () => {
  it("returns the lowercased last extension", () => {
    expect(getExtension("src/App.TSX")).toBe("tsx");
    expect(getExtension("archive.tar.gz")).toBe("gz");
  });

  it("returns the whole name when there is no dot", () => {
    expect(getExtension("Makefile")).toBe("makefile");
  });
});

describe("isBinaryFile", () => {
  it("flags known binary extensions", () => {
    expect(isBinaryFile("assets/logo.png")).toBe(true);
    expect(isBinaryFile("dist/app.wasm")).toBe(true);
  });

  it("does not flag text files", () => {
    expect(isBinaryFile("src/index.ts")).toBe(false);
    expect(isBinaryFile("Makefile")).toBe(false);
  });
});

describe("getLanguageTag", () => {
  it("maps known extensions", () => {
    expect(getLanguageTag("main.rs")).toBe("rust");
    expect(getLanguageTag("config.yml")).toBe("yaml");
    expect(getLanguageTag("notebook.ipynb")).toBe("python");
  });

  it("returns an empty string for unknown extensions", () => {
    expect(getLanguageTag("data.unknown")).toBe("");
    expect(getLanguageTag("Makefile")).toBe("");
  });
});
