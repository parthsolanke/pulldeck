import { DEFAULT_MAX_FILE_SIZE_BYTES } from "./config";

export interface Bundle {
  id: string;
  name: string;
  repo: string;
  files: string[];
  createdAt: number;
}

const BUNDLES_KEY = "pulldeck:bundles";

export async function getBundles(): Promise<Bundle[]> {
  const result = await chrome.storage.local.get(BUNDLES_KEY);
  return result[BUNDLES_KEY] ?? [];
}

export async function saveBundle(bundle: Bundle): Promise<void> {
  const bundles = await getBundles();
  const next = [...bundles.filter((b) => b.id !== bundle.id), bundle];
  await chrome.storage.local.set({ [BUNDLES_KEY]: next });
}

export async function deleteBundle(id: string): Promise<void> {
  const bundles = await getBundles();
  await chrome.storage.local.set({
    [BUNDLES_KEY]: bundles.filter((b) => b.id !== id),
  });
}

export interface ActiveRepo {
  owner: string;
  repo: string;
  defaultBranch: string;
}

export interface FileTreeEntry {
  path: string;
  size: number;
}

export interface FileTree {
  files: FileTreeEntry[];
  truncated: boolean;
}

export const ACTIVE_REPO_KEY = "pulldeck:activeRepo";
export const FILE_TREE_KEY = "pulldeck:fileTree";

export async function getActiveRepo(): Promise<ActiveRepo | null> {
  const result = await chrome.storage.local.get(ACTIVE_REPO_KEY);
  return result[ACTIVE_REPO_KEY] ?? null;
}

export async function getFileTree(): Promise<FileTree | null> {
  const result = await chrome.storage.local.get(FILE_TREE_KEY);
  return result[FILE_TREE_KEY] ?? null;
}

export async function setActiveRepoAndFileTree(
  activeRepo: ActiveRepo,
  fileTree: FileTree,
): Promise<void> {
  await chrome.storage.local.set({
    [ACTIVE_REPO_KEY]: activeRepo,
    [FILE_TREE_KEY]: fileTree,
  });
}

export async function clearActiveRepo(): Promise<void> {
  await chrome.storage.local.remove([ACTIVE_REPO_KEY, FILE_TREE_KEY]);
}

export type PatternMode = "exclude" | "include";
export type ThemeMode = "system" | "light" | "dark";

export interface PulldeckSettings {
  maxFileSizeBytes: number;
  filePatterns: string[];
  patternMode: PatternMode;
  theme: ThemeMode;
}

export const SETTINGS_KEY = "pulldeck:settings";

const DEFAULT_SETTINGS: PulldeckSettings = {
  maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES,
  filePatterns: [],
  patternMode: "exclude",
  theme: "system",
};

export async function getSettings(): Promise<PulldeckSettings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  // Merged, not returned raw — an older stored shape would otherwise come back missing fields.
  return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] ?? {}) };
}

export async function saveSettings(settings: PulldeckSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export interface GitHubInstallation {
  installationId: number;
  token: string;
  expiresAt: string;
}

export const GITHUB_INSTALLATION_KEY = "pulldeck:githubInstallation";

export async function getGitHubInstallation(): Promise<GitHubInstallation | null> {
  const result = await chrome.storage.local.get(GITHUB_INSTALLATION_KEY);
  return result[GITHUB_INSTALLATION_KEY] ?? null;
}

export async function setGitHubInstallation(installation: GitHubInstallation): Promise<void> {
  await chrome.storage.local.set({ [GITHUB_INSTALLATION_KEY]: installation });
}

export async function clearGitHubInstallation(): Promise<void> {
  await chrome.storage.local.remove(GITHUB_INSTALLATION_KEY);
}
