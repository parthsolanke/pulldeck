// Ported from gitingest's notebook.py — converts a .ipynb's cells into a compact pseudo-Python script instead of raw notebook JSON.

interface NotebookOutput {
  output_type: string;
  text?: string[] | string;
  data?: { "text/plain"?: string[] | string };
  ename?: string;
  evalue?: string;
}

interface NotebookCell {
  cell_type: string;
  source: string[] | string;
  outputs?: NotebookOutput[];
}

interface NotebookJson {
  cells?: NotebookCell[];
  worksheets?: Array<{ cells: NotebookCell[] }>;
}

function joinLines(value: string[] | string | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value.join("") : value;
}

function toOutputLines(value: string[] | string | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : value.split("\n");
}

function extractOutput(output: NotebookOutput): string[] {
  if (output.output_type === "stream") return toOutputLines(output.text);
  if (output.output_type === "execute_result" || output.output_type === "display_data") {
    return toOutputLines(output.data?.["text/plain"]);
  }
  if (output.output_type === "error") return [`Error: ${output.ename}: ${output.evalue}`];
  return [];
}

function renderCell(cell: NotebookCell): string | null {
  const source = joinLines(cell.source);
  if (!source) return null;

  if (cell.cell_type === "markdown" || cell.cell_type === "raw") {
    return `"""\n${source}\n"""`;
  }

  const outputLines = (cell.outputs ?? []).flatMap(extractOutput);
  if (outputLines.length === 0) return source;
  return `${source}\n# Output:\n#   ${outputLines.join("\n#   ")}`;
}

export function processNotebook(rawJson: string): string {
  let notebook: NotebookJson;
  try {
    notebook = JSON.parse(rawJson);
  } catch {
    // Fails open — still taggable, just not specially rendered.
    return rawJson;
  }

  const cells = notebook.worksheets
    ? notebook.worksheets.flatMap((worksheet) => worksheet.cells)
    : notebook.cells ?? [];

  const parts = ["# Jupyter notebook converted to Python script."];
  for (const cell of cells) {
    const rendered = renderCell(cell);
    if (rendered) parts.push(rendered);
  }
  return parts.join("\n\n") + "\n";
}
