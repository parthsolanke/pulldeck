const SECRET_HEADER = "X-Pulldeck-Secret";

export function hasValidSharedSecret(request: Request, expectedSecret: string): boolean {
  const provided = request.headers.get(SECRET_HEADER);
  return provided !== null && provided === expectedSecret;
}
