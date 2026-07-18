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
