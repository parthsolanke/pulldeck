import { createAppAuth } from "@octokit/auth-app";

export type InstallationTokenResult =
  | { ok: true; token: string; expiresAt: string }
  | { ok: false; error: "installation_not_found" | "unknown" };

function isGitHubRequestError(error: unknown): error is { status: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { status?: unknown }).status === "number"
  );
}

export async function exchangeInstallationToken(
  appId: string,
  privateKey: string,
  installationId: number,
): Promise<InstallationTokenResult> {
  const auth = createAppAuth({ appId, privateKey });

  try {
    const installationAuthentication = await auth({ type: "installation", installationId });
    return {
      ok: true,
      token: installationAuthentication.token,
      expiresAt: installationAuthentication.expiresAt,
    };
  } catch (error) {
    if (isGitHubRequestError(error) && error.status === 404) {
      return { ok: false, error: "installation_not_found" };
    }
    return { ok: false, error: "unknown" };
  }
}
