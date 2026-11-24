import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FileMatch } from "./search";

const storageMock = vi.hoisted(() => ({
  getFileTree: vi.fn(),
  getSettings: vi.fn(),
  FILE_TREE_KEY: "pulldeck:fileTree",
  SETTINGS_KEY: "pulldeck:settings",
}));

vi.mock("../../lib/storage", () => storageMock);

type ChangeMap = Record<string, { newValue?: unknown }>;
type ChangeListener = (changes: ChangeMap, area: string) => void;

let changeListener: ChangeListener | undefined;
let searchFiles: (query: string) => FileMatch[];

const DEFAULT_SETTINGS: {
  maxFileSizeBytes: number;
  filePatterns: string[];
  patternMode: "exclude" | "include";
  theme: "system" | "light" | "dark";
} = {
  maxFileSizeBytes: 200 * 1024,
  filePatterns: [],
  patternMode: "exclude",
  theme: "system",
};

function settings(overrides: Partial<typeof DEFAULT_SETTINGS> = {}) {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

function file(path: string, size = 1) {
  return { path, size };
}

function applyChange(
  files: ReturnType<typeof file>[],
  nextSettings = settings(),
  area = "local",
) {
  changeListener?.(
    {
      [storageMock.FILE_TREE_KEY]: { newValue: { files, truncated: false } },
      [storageMock.SETTINGS_KEY]: { newValue: nextSettings },
    },
    area,
  );
}

beforeAll(async () => {
  vi.stubGlobal("chrome", {
    storage: {
      onChanged: {
        addListener: (listener: ChangeListener) => {
          changeListener = listener;
        },
      },
    },
  });
  storageMock.getFileTree.mockResolvedValue(null);
  storageMock.getSettings.mockResolvedValue(settings());

  ({ searchFiles } = await import("./search"));
  await new Promise((resolve) => setTimeout(resolve, 0));
});

beforeEach(() => {
  applyChange([], settings());
});

describe("searchFiles", () => {
  it("returns every file for an empty query with no highlight indexes", () => {
    applyChange([file("src/a.ts"), file("README.md")]);

    const results = searchFiles("");

    expect(results.map((result) => result.path)).toEqual(["src/a.ts", "README.md"]);
    expect(results.every((result) => result.matchedIndexes.size === 0)).toBe(true);
  });

  it("caps the result list for an empty query", () => {
    applyChange(Array.from({ length: 60 }, (_, index) => file(`f${index}.ts`)));

    expect(searchFiles("")).toHaveLength(50);
  });

  it("filters out files larger than the clamped maximum size", () => {
    applyChange([file("small.ts", 5), file("big.ts", 5000)], settings({ maxFileSizeBytes: 1 }));

    expect(searchFiles("").map((result) => result.path)).toEqual(["small.ts"]);
  });

  it("excludes paths matching patterns in exclude mode", () => {
    applyChange(
      [file("src/a.ts"), file("src/a.test.ts")],
      settings({ filePatterns: ["*.test.ts"], patternMode: "exclude" }),
    );

    expect(searchFiles("").map((result) => result.path)).toEqual(["src/a.ts"]);
  });

  it("keeps only matching paths in include mode", () => {
    applyChange(
      [file("src/a.ts"), file("src/a.test.ts")],
      settings({ filePatterns: ["*.test.ts"], patternMode: "include" }),
    );

    expect(searchFiles("").map((result) => result.path)).toEqual(["src/a.test.ts"]);
  });

  it("does not restrict anything when no patterns are set", () => {
    applyChange(
      [file("src/a.ts"), file("src/a.test.ts")],
      settings({ filePatterns: [], patternMode: "include" }),
    );

    expect(searchFiles("")).toHaveLength(2);
  });

  it("matches queries against the basename and reports highlight indexes", () => {
    applyChange([file("models/model.py"), file("src/index.ts")]);

    const results = searchFiles("index");

    expect(results.map((result) => result.path)).toEqual(["src/index.ts"]);
    expect(results[0].matchedIndexes.size).toBeGreaterThan(0);
  });

  it("returns no results when nothing matches", () => {
    applyChange([file("src/index.ts")]);

    expect(searchFiles("zzzz")).toEqual([]);
  });

  it("ignores storage changes outside the local area", () => {
    applyChange([file("src/index.ts")], settings(), "sync");

    expect(searchFiles("")).toEqual([]);
  });

  it("keeps the existing file tree when only settings change", () => {
    applyChange([file("src/index.ts")]);

    changeListener?.(
      { [storageMock.SETTINGS_KEY]: { newValue: settings({ theme: "dark" }) } },
      "local",
    );

    expect(searchFiles("").map((result) => result.path)).toEqual(["src/index.ts"]);
  });
});
