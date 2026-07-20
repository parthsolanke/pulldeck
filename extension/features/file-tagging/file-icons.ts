import rawManifest from "./file-icons-manifest.json";

interface FileIconManifest {
  fileExtensions: Record<string, string>;
  fileNames: Record<string, string>;
  languageIds: Record<string, string>;
  file: string;
}

const manifest = rawManifest as FileIconManifest;

function getIconName(path: string): string {
  const basename = (path.split("/").pop() ?? path).toLowerCase();

  const exact = manifest.fileNames[basename];
  if (exact) return exact;

  // Longest suffix first: "foo.d.ts" should match "d.ts", not the plain
  // "ts" icon, and material-icon-theme's manifest has both as distinct keys.
  const segments = basename.split(".");
  for (let i = 1; i < segments.length; i++) {
    const suffix = segments.slice(i).join(".");
    const match = manifest.fileExtensions[suffix] ?? manifest.languageIds[suffix];
    if (match) return match;
  }

  return manifest.file;
}

export function getFileIconUrl(path: string): string {
  return chrome.runtime.getURL(`file-icons/${getIconName(path)}.svg`);
}

export function getDefaultFileIconUrl(): string {
  return chrome.runtime.getURL(`file-icons/${manifest.file}.svg`);
}
