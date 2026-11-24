import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_FILE_SIZE_BYTES,
  HARD_MAX_FILE_SIZE_BYTES,
  MIN_MAX_FILE_SIZE_BYTES,
  clampMaxFileSize,
} from "./config";

describe("clampMaxFileSize", () => {
  it("keeps a value inside the allowed range", () => {
    expect(clampMaxFileSize(50 * 1024)).toBe(50 * 1024);
  });

  it("raises values below the minimum", () => {
    expect(clampMaxFileSize(1)).toBe(MIN_MAX_FILE_SIZE_BYTES);
  });

  it("lowers values above the hard maximum", () => {
    expect(clampMaxFileSize(HARD_MAX_FILE_SIZE_BYTES * 4)).toBe(HARD_MAX_FILE_SIZE_BYTES);
  });

  it("falls back to the default for non-finite values", () => {
    expect(clampMaxFileSize(Number.NaN)).toBe(DEFAULT_MAX_FILE_SIZE_BYTES);
    expect(clampMaxFileSize(Number.POSITIVE_INFINITY)).toBe(DEFAULT_MAX_FILE_SIZE_BYTES);
  });
});
