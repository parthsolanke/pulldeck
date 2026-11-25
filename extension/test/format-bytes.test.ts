import { describe, expect, it } from "vitest";
import { formatBytes } from "../lib/format-bytes";

describe("formatBytes", () => {
  it("shows raw bytes below one kilobyte", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("formats kilobytes with one decimal under ten", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("drops the decimal at ten and above", () => {
    expect(formatBytes(10 * 1024)).toBe("10 KB");
    expect(formatBytes(200 * 1024)).toBe("200 KB");
  });

  it("steps up through megabytes and gigabytes", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(5.5 * 1024 * 1024)).toBe("5.5 MB");
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe("2.0 GB");
  });

  it("stops scaling at gigabytes", () => {
    expect(formatBytes(3 * 1024 * 1024 * 1024 * 1024)).toBe("3072 GB");
  });
});
