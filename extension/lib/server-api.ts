// Calls pulldeck's own auth-server (server/), not GitHub directly — same reasoning as github-api.ts: background worker only, never a content script.

export type FetchInstallationTokenResult =
  | { ok: true; token: string; expiresAt: string }
  | { ok: false; error: "unauthorized" | "invalid_request" | "installation_not_found" | "unknown" };

export async function fetchInstallationToken(
  installationId: number,
): Promise<FetchInstallationTokenResult> {
  try {
    const response = await fetch(`${import.meta.env.VITE_PULLDECK_SERVER_URL}/installation-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Pulldeck-Secret": import.meta.env.VITE_PULLDECK_CLIENT_SECRET,
      },
      body: JSON.stringify({ installationId }),
    });
    return (await response.json()) as FetchInstallationTokenResult;
  } catch {
    return { ok: false, error: "unknown" };
  }
}
