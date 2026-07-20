#!/usr/bin/env node
// Regenerates extension/public/file-icons and the lookup manifest from
// material-icon-theme. Re-run after bumping the material-icon-theme version.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, "..");
const themeRoot = path.resolve(pkgRoot, "node_modules/material-icon-theme");

const theme = JSON.parse(
  readFileSync(path.join(themeRoot, "dist/material-icons.json"), "utf-8"),
);

const { fileExtensions, fileNames, languageIds, file: defaultIcon } = theme;

const usedIcons = new Set([defaultIcon]);
for (const name of Object.values(fileExtensions)) usedIcons.add(name);
for (const name of Object.values(fileNames)) usedIcons.add(name);
for (const name of Object.values(languageIds)) usedIcons.add(name);

const outIconsDir = path.join(pkgRoot, "public/file-icons");
rmSync(outIconsDir, { recursive: true, force: true });
mkdirSync(outIconsDir, { recursive: true });

// A handful of icon names referenced by the manifest have no matching SVG
// in this theme version; the runtime lookup falls back to the default file
// icon for these via <img onerror>, so we just skip copying them here.
let skipped = 0;
for (const name of usedIcons) {
  const src = path.join(themeRoot, "icons", `${name}.svg`);
  if (!existsSync(src)) {
    skipped += 1;
    continue;
  }
  copyFileSync(src, path.join(outIconsDir, `${name}.svg`));
}
copyFileSync(
  path.join(themeRoot, "LICENSE"),
  path.join(outIconsDir, "LICENSE"),
);

const outManifestPath = path.join(
  pkgRoot,
  "features/file-tagging/file-icons-manifest.json",
);
writeFileSync(
  outManifestPath,
  JSON.stringify({ fileExtensions, fileNames, languageIds, file: defaultIcon }),
);

console.log(`Wrote ${usedIcons.size - skipped} icons to ${outIconsDir} (${skipped} skipped, no source SVG)`);
console.log(`Wrote manifest to ${outManifestPath}`);
