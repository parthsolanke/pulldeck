import { describe, expect, it } from "vitest";
import { processNotebook } from "../features/file-tagging/notebook";

const HEADER = "# Jupyter notebook converted to Python script.";

function notebook(cells: unknown[]): string {
  return JSON.stringify({ cells });
}

describe("processNotebook", () => {
  it("returns the raw input when JSON is invalid", () => {
    expect(processNotebook("{not json")).toBe("{not json");
  });

  it("emits only the header for an empty notebook", () => {
    expect(processNotebook("{}")).toBe(`${HEADER}\n`);
  });

  it("renders a code cell without outputs as its source", () => {
    const raw = notebook([{ cell_type: "code", source: ["print(1)"] }]);
    expect(processNotebook(raw)).toBe(`${HEADER}\n\nprint(1)\n`);
  });

  it("joins array sources and accepts a plain string source", () => {
    const raw = notebook([
      { cell_type: "code", source: ["a = 1\n", "b = 2"] },
      { cell_type: "code", source: "c = 3" },
    ]);
    expect(processNotebook(raw)).toBe(`${HEADER}\n\na = 1\nb = 2\n\nc = 3\n`);
  });

  it("wraps markdown and raw cells in triple quotes", () => {
    const raw = notebook([
      { cell_type: "markdown", source: ["# Title"] },
      { cell_type: "raw", source: "raw text" },
    ]);
    expect(processNotebook(raw)).toBe(
      `${HEADER}\n\n"""\n# Title\n"""\n\n"""\nraw text\n"""\n`,
    );
  });

  it("skips cells with empty source", () => {
    const raw = notebook([
      { cell_type: "code", source: [] },
      { cell_type: "code", source: "x = 1" },
    ]);
    expect(processNotebook(raw)).toBe(`${HEADER}\n\nx = 1\n`);
  });

  it("appends stream output lines", () => {
    const raw = notebook([
      {
        cell_type: "code",
        source: "print('hi')",
        outputs: [{ output_type: "stream", text: "hi" }],
      },
    ]);
    expect(processNotebook(raw)).toBe(
      `${HEADER}\n\nprint('hi')\n# Output:\n#   hi\n`,
    );
  });

  it("joins array stream output without splitting on newlines", () => {
    const raw = notebook([
      {
        cell_type: "code",
        source: "x",
        outputs: [{ output_type: "stream", text: ["one\n", "two\n"] }],
      },
    ]);
    expect(processNotebook(raw)).toContain("x\n# Output:\n#   one\n\n#   two\n");
  });

  it("renders execute_result and display_data text/plain output", () => {
    const raw = notebook([
      {
        cell_type: "code",
        source: "1 + 1",
        outputs: [{ output_type: "execute_result", data: { "text/plain": "2" } }],
      },
      {
        cell_type: "code",
        source: "plot()",
        outputs: [{ output_type: "display_data", data: { "text/plain": ["<fig>"] } }],
      },
    ]);
    expect(processNotebook(raw)).toBe(
      `${HEADER}\n\n1 + 1\n# Output:\n#   2\n\nplot()\n# Output:\n#   <fig>\n`,
    );
  });

  it("renders error output", () => {
    const raw = notebook([
      {
        cell_type: "code",
        source: "boom()",
        outputs: [
          { output_type: "error", ename: "ValueError", evalue: "bad value" },
        ],
      },
    ]);
    expect(processNotebook(raw)).toBe(
      `${HEADER}\n\nboom()\n# Output:\n#   Error: ValueError: bad value\n`,
    );
  });

  it("ignores unsupported output types", () => {
    const raw = notebook([
      {
        cell_type: "code",
        source: "x",
        outputs: [{ output_type: "unknown" }],
      },
    ]);
    expect(processNotebook(raw)).toBe(`${HEADER}\n\nx\n`);
  });

  it("supports legacy worksheet-based notebooks", () => {
    const raw = JSON.stringify({
      worksheets: [
        {
          cells: [
            { cell_type: "code", source: "from_sheet = True" },
          ],
        },
      ],
    });
    expect(processNotebook(raw)).toBe(`${HEADER}\n\nfrom_sheet = True\n`);
  });
});
