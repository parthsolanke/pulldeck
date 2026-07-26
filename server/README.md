# server

Cloudflare Worker: signs a JWT with the GitHub App's private key and
exchanges it for a short-lived installation access token via
`@octokit/auth-app`. Stateless — no database, no persistent state (see #13
for why Cloudflare Workers over Vercel Edge Functions).

## Endpoint

```
POST /installation-token
X-Pulldeck-Secret: <shared secret>
Content-Type: application/json

{ "installationId": 12345678 }
```

Returns `{ ok: true, token, expiresAt }` on success, or
`{ ok: false, error }` with `error` one of `unauthorized` / `invalid_request`
/ `installation_not_found` / `unknown`.

## One-time setup

1. Convert the GitHub App's private key from the PKCS#1 format GitHub
   provides to PKCS#8 (Cloudflare Workers signs over the Web Crypto API,
   which only accepts PKCS#8):

   ```
   openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt \
     -in original-private-key.pem -out private-key-pkcs8.pem
   ```

2. Set secrets (never commit these; `wrangler secret put` prompts for the
   value, supporting multi-line paste for the private key):

   ```
   wrangler secret put GITHUB_APP_ID
   wrangler secret put GITHUB_APP_PRIVATE_KEY   # paste the PKCS#8 key
   wrangler secret put CLIENT_SHARED_SECRET     # any random value
   ```

## Local dev

For `wrangler dev`, secrets come from a `server/.dev.vars` file (gitignored,
dotenv-style) instead of the deployed secret store:

```
GITHUB_APP_ID=4399918
GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...paste the converted PKCS#8 key here, with real line breaks...
-----END PRIVATE KEY-----"
CLIENT_SHARED_SECRET=some-local-testing-value
```

```
pnpm --filter server dev
```

## Deploy

```
pnpm --filter server deploy
```
