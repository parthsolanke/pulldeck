// `*` only; a slash-free pattern matches at any depth, one with `/` matches literally.
export function compileGlobPattern(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const body = pattern.includes("/") ? escaped : `(?:.*/)?${escaped}`;
  return new RegExp(`^${body}$`);
}

// Mode-neutral — caller decides whether a match means keep or drop.
export function matchesAnyPattern(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => compileGlobPattern(pattern).test(path));
}
