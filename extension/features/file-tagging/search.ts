import fuzzysort from "fuzzysort";
import { FILE_TREE_KEY, getFileTree } from "../../lib/storage";

let files: string[] = [];

getFileTree().then((tree) => {
  files = tree?.files ?? [];
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && FILE_TREE_KEY in changes) {
    files = changes[FILE_TREE_KEY].newValue?.files ?? [];
  }
});

export function searchFiles(query: string): string[] {
  if (!query) return files;
  return fuzzysort.go(query, files).map((result) => result.target);
}
