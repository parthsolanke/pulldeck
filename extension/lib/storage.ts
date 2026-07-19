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

export interface FileTree {
  files: string[];
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
