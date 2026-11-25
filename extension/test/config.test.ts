import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_FILE_SIZE_BYTES,
  HARD_MAX_FILE_SIZE_BYTES,
  MIN_MAX_FILE_SIZE_BYTES,
  clampMaxFileSize,
} from "../lib/config";

describe("clampMaxFileSize", () => {
  it("keeps a value inside the allowed range unchanged", () => {
    expect(clampMaxFileSize(500 * 1024)).toBe(500 * 1024);
  });

  it("raises values below the minimum to the minimum", () => {
    expect(clampMaxFileSize(0)).toBe(MIN_MAX_FILE_SIZE_BYTES);
    expect(clampMaxFileSize(-10)).toBe(MIN_MAX_FILE_SIZE_BYTES);
  });

  it("caps values above the hard maximum", () => {
    expect(clampMaxFileSize(Number.MAX_SAFE_INTEGER)).toBe(HARD_MAX_FILE_SIZE_BYTES);
  });

  it("falls back to the default for non-finite input", () => {
    expect(clampMaxFileSize(Number.NaN)).toBe(DEFAULT_MAX_FILE_SIZE_BYTES);
    expect(clampMaxFileSize(Number.POSITIVE_INFINITY)).toBe(DEFAULT_MAX_FILE_SIZE_BYTES);
  });
});
