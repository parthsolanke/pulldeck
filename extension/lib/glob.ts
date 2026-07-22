// Minimal glob matching: `*` only, no `**`/character classes. A slash-free
// pattern (e.g. "package-lock.json") matches at any depth; a pattern
// containing "/" is matched literally against the full path.
export function compileGlobPattern(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const body = pattern.includes("/") ? escaped : `(?:.*/)?${escaped}`;
  return new RegExp(`^${body}$`);
}

// Mode-neutral — the caller decides whether a match means "keep" (include
// mode) or "drop" (exclude mode).
export function matchesAnyPattern(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => compileGlobPattern(pattern).test(path));
}
