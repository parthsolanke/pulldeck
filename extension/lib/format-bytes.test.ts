import { describe, expect, it } from "vitest";
import { formatBytes } from "./format-bytes";

describe("formatBytes", () => {
  it("shows raw bytes below one KiB", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
  });

  it("shows one decimal place for small units", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("drops decimals once the value reaches ten", () => {
    expect(formatBytes(10 * 1024)).toBe("10 KB");
    expect(formatBytes(200 * 1024)).toBe("200 KB");
  });

  it("steps up through MB and GB", () => {
    expect(formatBytes(1024 ** 2)).toBe("1.0 MB");
    expect(formatBytes(1024 ** 3)).toBe("1.0 GB");
  });
});
