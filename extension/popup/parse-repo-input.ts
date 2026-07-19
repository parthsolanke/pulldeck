export function parseRepoInput(
  input: string,
): { owner: string; repo: string } | null {
  const value = input
    .trim()
    .replace(/^git@github\.com:/i, "")
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");

  const [owner, repo] = value.split("/");
  if (!owner || !repo) return null;

  return { owner, repo };
}
