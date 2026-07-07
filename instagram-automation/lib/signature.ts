import crypto from "node:crypto";

/**
 * Verify Meta's X-Hub-Signature-256 header against the raw request body.
 * https://developers.facebook.com/docs/messenger-platform/webhooks#validate-payloads
 */
export function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;

  const theirs = signatureHeader.slice("sha256=".length);
  const ours = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const theirsBuf = Buffer.from(theirs, "hex");
  const oursBuf = Buffer.from(ours, "hex");
  if (theirsBuf.length !== oursBuf.length) return false;
  return crypto.timingSafeEqual(theirsBuf, oursBuf);
}
