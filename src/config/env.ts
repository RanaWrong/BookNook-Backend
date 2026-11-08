const WEAK_SECRET_PATTERN = /your_|changeme|booknook|dev_key|example/i;

/**
 * JWT signing secret. There is deliberately no fallback value: a missing or
 * guessable secret must stop the server instead of silently signing tokens
 * with a key that anyone reading the repository can see.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32 || WEAK_SECRET_PATTERN.test(secret)) {
    throw new Error(
      "JWT_SECRET must be set to a random value of at least 32 characters " +
        "(generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64'))\")."
    );
  }
  return secret;
}

/**
 * Browser origins allowed to call the API (comma separated CORS_ORIGINS, or
 * CLIENT_URL). Outside production the local Next.js dev server is allowed by
 * default; in production nothing is allowed until an origin is configured.
 */
export function getAllowedOrigins(): string[] {
  const configured = (process.env.CORS_ORIGINS ?? process.env.CLIENT_URL ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  if (configured.length > 0) return configured;
  return process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000"];
}
