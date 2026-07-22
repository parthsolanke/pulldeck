import fuzzysort from "fuzzysort";
import { DEFAULT_EXCLUDE_PATTERNS, DEFAULT_MAX_FILE_SIZE_BYTES, clampMaxFileSize } from "../../lib/config";
import { matchesAnyPattern } from "../../lib/glob";
import {
  FILE_TREE_KEY,
  SETTINGS_KEY,
  getFileTree,
  getSettings,
  type FileTreeEntry,
  type PulldeckSettings,
} from "../../lib/storage";

interface FileEntry {
  path: string;
  basename: string;
}

function toFileEntry(entry: FileTreeEntry): FileEntry {
  return { path: entry.path, basename: entry.path.split("/").pop() ?? entry.path };
}

let rawFiles: FileTreeEntry[] = [];
let settings: PulldeckSettings = {
  maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES,
  filePatterns: DEFAULT_EXCLUDE_PATTERNS,
  patternMode: "exclude",
};
let files: FileEntry[] = [];

function rebuildFiles(): void {
  const cap = clampMaxFileSize(settings.maxFileSizeBytes);
  const patterns = settings.filePatterns;
  files = rawFiles
    .filter((entry) => entry.size <= cap)
    .filter((entry) => {
      // No patterns set → neither mode restricts anything yet.
      if (patterns.length === 0) return true;
      const matches = matchesAnyPattern(entry.path, patterns);
      return settings.patternMode === "include" ? matches : !matches;
    })
    .map(toFileEntry);
}

Promise.all([getFileTree(), getSettings()]).then(([tree, resolvedSettings]) => {
  rawFiles = tree?.files ?? [];
  settings = resolvedSettings;
  rebuildFiles();
});

// One combined listener, not two — avoids rebuilding on a stale value if both keys change in one write.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  let changed = false;
  if (FILE_TREE_KEY in changes) {
    rawFiles = changes[FILE_TREE_KEY].newValue?.files ?? [];
    changed = true;
  }
  if (SETTINGS_KEY in changes) {
    settings = changes[SETTINGS_KEY].newValue ?? settings;
    changed = true;
  }
  if (changed) rebuildFiles();
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
