import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchInstallationToken } from "./server-api";
import { getGitHubInstallation, setGitHubInstallation } from "./storage";
import { getValidInstallationToken } from "./github-auth";

vi.mock("./server-api", () => ({ fetchInstallationToken: vi.fn() }));
vi.mock("./storage", () => ({
  getGitHubInstallation: vi.fn(),
  setGitHubInstallation: vi.fn(),
}));

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

const installation = {
  installationId: 42,
  token: "cached-token",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};

beforeEach(() => {
  vi.mocked(getGitHubInstallation).mockReset();
  vi.mocked(setGitHubInstallation).mockReset();
  vi.mocked(fetchInstallationToken).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getValidInstallationToken", () => {
  it("reports not_connected when no installation is stored", async () => {
    vi.mocked(getGitHubInstallation).mockResolvedValue(null);

    await expect(getValidInstallationToken()).resolves.toEqual({
      ok: false,
      error: "not_connected",
    });
    expect(fetchInstallationToken).not.toHaveBeenCalled();
  });

  it("returns a cached token that is not close to expiry", async () => {
    vi.mocked(getGitHubInstallation).mockResolvedValue(installation);

    await expect(getValidInstallationToken()).resolves.toEqual({
      ok: true,
      token: "cached-token",
    });
    expect(fetchInstallationToken).not.toHaveBeenCalled();
  });

  it("refreshes and persists a token that is within the refetch margin", async () => {
    vi.mocked(getGitHubInstallation).mockResolvedValue({
      ...installation,
      expiresAt: new Date(Date.now() + REFRESH_MARGIN_MS - 1000).toISOString(),
    });
    vi.mocked(fetchInstallationToken).mockResolvedValue({
      ok: true,
      token: "fresh-token",
      expiresAt: "2030-01-01T00:00:00Z",
    });

    await expect(getValidInstallationToken()).resolves.toEqual({
      ok: true,
      token: "fresh-token",
    });

    expect(fetchInstallationToken).toHaveBeenCalledWith(42);
    expect(setGitHubInstallation).toHaveBeenCalledWith({
      installationId: 42,
      token: "fresh-token",
      expiresAt: "2030-01-01T00:00:00Z",
    });
  });

  it("passes through a failed refresh without persisting anything", async () => {
    vi.mocked(getGitHubInstallation).mockResolvedValue({
      ...installation,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    vi.mocked(fetchInstallationToken).mockResolvedValue({
      ok: false,
      error: "unauthorized",
    });

    await expect(getValidInstallationToken()).resolves.toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(setGitHubInstallation).not.toHaveBeenCalled();
  });
});
