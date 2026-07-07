/**
 * Central, lazily-validated access to environment variables.
 *
 * Getters (rather than eager reads) mean `next build` succeeds without any
 * env configured; a clear error is thrown at request time only when a value
 * is actually needed.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export const env = {
  get metaAppSecret(): string {
    return required("META_APP_SECRET");
  },
  get metaAccessToken(): string {
    return required("META_ACCESS_TOKEN");
  },
  get igBusinessAccountId(): string {
    return required("IG_BUSINESS_ACCOUNT_ID");
  },
  get pageId(): string {
    return required("PAGE_ID");
  },
  get verifyToken(): string {
    return required("VERIFY_TOKEN");
  },
  get googleSheetId(): string {
    return required("GOOGLE_SHEET_ID");
  },
  /**
   * Accepts the raw service-account JSON or a base64-encoded version of it
   * (base64 is easier to paste into the Vercel env var UI without escaping).
   */
  get googleServiceAccountKey(): { client_email: string; private_key: string } {
    const raw = required("GOOGLE_SERVICE_ACCOUNT_KEY");
    const jsonText = raw.trimStart().startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf8");
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.client_email || !parsed.private_key) {
        throw new Error("key JSON is missing client_email or private_key");
      }
      return parsed;
    } catch (err) {
      throw new Error(
        `GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON (or base64 of JSON): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  },
};
