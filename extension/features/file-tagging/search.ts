import fuzzysort from "fuzzysort";
import { FILE_TREE_KEY, getFileTree } from "../../lib/storage";

interface FileEntry {
  path: string;
  basename: string;
}

function toFileEntry(path: string): FileEntry {
  return { path, basename: path.split("/").pop() ?? path };
}

let files: FileEntry[] = [];

getFileTree().then((tree) => {
  files = (tree?.files ?? []).map(toFileEntry);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && FILE_TREE_KEY in changes) {
    files = (changes[FILE_TREE_KEY].newValue?.files ?? []).map(toFileEntry);
  }
});

export interface FileMatch {
  path: string;
  basename: string;
  matchedIndexes: ReadonlySet<number>;
}

const NO_MATCHES: ReadonlySet<number> = new Set();

// The dropdown only ever shows a handful of rows before scrolling — no
// point computing (and rendering) match highlights for the rest of a
// large repo on every keystroke.
const RESULT_LIMIT = 50;

export function searchFiles(query: string): FileMatch[] {
  if (!query) {
    return files.slice(0, RESULT_LIMIT).map((file) => ({
      path: file.path,
      basename: file.basename,
      matchedIndexes: NO_MATCHES,
    }));
  }
  // Matched against the filename only, not the full path — a directory that
  // happens to share letters with the query (e.g. a "models/" folder) isn't
  // what someone typing a filename means to search for.
  return fuzzysort
    .go(query, files, { key: (file) => file.basename, limit: RESULT_LIMIT })
    .map((result) => ({
      path: result.obj.path,
      basename: result.obj.basename,
      matchedIndexes: new Set(result.indexes),
    }));
}
