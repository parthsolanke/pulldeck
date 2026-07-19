import fuzzysort from "fuzzysort";
import { MOCK_FILES } from "./mock-files";

export function searchFiles(query: string): string[] {
  if (!query) return MOCK_FILES;
  return fuzzysort.go(query, MOCK_FILES).map((result) => result.target);
}
