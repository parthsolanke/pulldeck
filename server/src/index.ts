import { Hono } from "hono";
import type { Env } from "./env";
import { hasValidSharedSecret } from "./require-shared-secret";
import { exchangeInstallationToken } from "./installation-token";

const app = new Hono<{ Bindings: Env }>();

app.notFound((c) => c.json({ ok: false, error: "not_found" }, 404));

app.post(
  "/installation-token",
  async (c, next) => {
    if (!hasValidSharedSecret(c.req.raw, c.env.CLIENT_SHARED_SECRET)) {
      return c.json({ ok: false, error: "unauthorized" }, 401);
    }
    await next();
  },
  async (c) => {
    let body: { installationId?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false, error: "invalid_request" }, 400);
    }

    const installationId = Number(body.installationId);
    if (!Number.isInteger(installationId) || installationId <= 0) {
      return c.json({ ok: false, error: "invalid_request" }, 400);
    }

    const result = await exchangeInstallationToken(
      c.env.GITHUB_APP_ID,
      c.env.GITHUB_APP_PRIVATE_KEY,
      installationId,
    );

    return c.json(result, result.ok ? 200 : result.error === "installation_not_found" ? 404 : 500);
  },
);

export default app;
