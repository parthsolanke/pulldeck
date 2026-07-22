const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp",
  "woff", "woff2", "ttf", "otf", "eot",
  "zip", "tar", "gz", "rar", "7z",
  "pdf", "exe", "dll", "so", "dylib",
  "mp3", "mp4", "wav", "avi", "mov", "webm",
  "class", "jar", "wasm",
  "db", "sqlite",
]);

export function getExtension(path: string): string | undefined {
  return path.split(".").pop()?.toLowerCase();
}

export function isBinaryFile(path: string): boolean {
  const ext = getExtension(path);
  return ext !== undefined && BINARY_EXTENSIONS.has(ext);
}

const LANGUAGE_TAGS: Record<string, string> = {
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  html: "html",
  css: "css",
  scss: "scss",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  xml: "xml",
  md: "markdown",
  sh: "bash",
  sql: "sql",
  ipynb: "python",
};

export function getLanguageTag(path: string): string {
  const ext = getExtension(path);
  return (ext && LANGUAGE_TAGS[ext]) || "";
}
