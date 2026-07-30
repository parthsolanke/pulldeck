import { fetchInstallationToken } from "./server-api";
import { getGitHubInstallation, setGitHubInstallation } from "./storage";

// Refresh this far ahead of actual expiry so a request in flight never straddles the boundary.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export type GetValidInstallationTokenResult =
  | { ok: true; token: string }
  | { ok: false; error: "not_connected" | "unauthorized" | "invalid_request" | "installation_not_found" | "unknown" };

export async function getValidInstallationToken(): Promise<GetValidInstallationTokenResult> {
  const installation = await getGitHubInstallation();
  if (!installation) return { ok: false, error: "not_connected" };

  const expiresAt = new Date(installation.expiresAt).getTime();
  if (expiresAt - Date.now() > REFRESH_MARGIN_MS) {
    return { ok: true, token: installation.token };
  }

  const result = await fetchInstallationToken(installation.installationId);
  if (!result.ok) return result;

  await setGitHubInstallation({
    installationId: installation.installationId,
    token: result.token,
    expiresAt: result.expiresAt,
  });

  return { ok: true, token: result.token };
}
