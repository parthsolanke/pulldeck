export interface HighlightRun {
  text: string;
  matched: boolean;
}

// Groups `text` into matched/unmatched runs so the caller only needs one DOM
// node per run instead of per character.
export function splitHighlightRuns(
  text: string,
  matchedIndexes: ReadonlySet<number>,
): HighlightRun[] {
  const runs: HighlightRun[] = [];
  let current = "";
  let currentMatched = false;

  for (let i = 0; i < text.length; i++) {
    const matched = matchedIndexes.has(i);
    if (current && matched !== currentMatched) {
      runs.push({ text: current, matched: currentMatched });
      current = "";
    }
    current += text[i];
    currentMatched = matched;
  }
  if (current) runs.push({ text: current, matched: currentMatched });

  return runs;
}
