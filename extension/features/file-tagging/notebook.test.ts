import { describe, expect, it } from "vitest";
import { processNotebook } from "./notebook";

const HEADER = "# Jupyter notebook converted to Python script.";

function notebook(cells: unknown[]): string {
  return JSON.stringify({ cells });
}

describe("processNotebook", () => {
  it("returns the raw input when the JSON is invalid", () => {
    expect(processNotebook("{not json")).toBe("{not json");
  });

  it("returns just the header for an empty notebook", () => {
    expect(processNotebook(notebook([]))).toBe(`${HEADER}\n`);
  });

  it("renders a code cell without outputs as plain source", () => {
    const result = processNotebook(notebook([{ cell_type: "code", source: ["print(1)"] }]));
    expect(result).toBe(`${HEADER}\n\nprint(1)\n`);
  });

  it("wraps markdown cells in triple quotes", () => {
    const result = processNotebook(
      notebook([{ cell_type: "markdown", source: ["# Title"] }]),
    );
    expect(result).toBe(`${HEADER}\n\n"""\n# Title\n"""\n`);
  });

  it("prefixes stream output as comments", () => {
    const result = processNotebook(
      notebook([
        {
          cell_type: "code",
          source: ["print(1)"],
          outputs: [{ output_type: "stream", text: ["1"] }],
        },
      ]),
    );
    expect(result).toBe(`${HEADER}\n\nprint(1)\n# Output:\n#   1\n`);
  });

  it("formats error output", () => {
    const result = processNotebook(
      notebook([
        {
          cell_type: "code",
          source: ["boom"],
          outputs: [{ output_type: "error", ename: "ValueError", evalue: "bad" }],
        },
      ]),
    );
    expect(result).toBe(`${HEADER}\n\nboom\n# Output:\n#   Error: ValueError: bad\n`);
  });

  it("falls back to worksheets when cells is absent", () => {
    const result = processNotebook(
      JSON.stringify({ worksheets: [{ cells: [{ cell_type: "code", source: ["x = 1"] }] }] }),
    );
    expect(result).toBe(`${HEADER}\n\nx = 1\n`);
  });

  it("skips cells with empty source", () => {
    const result = processNotebook(notebook([{ cell_type: "code", source: [] }]));
    expect(result).toBe(`${HEADER}\n`);
  });
});
