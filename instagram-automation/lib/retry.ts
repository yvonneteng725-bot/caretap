/**
 * Exponential backoff for Graph API calls.
 *
 * Retries on HTTP 429/5xx and on Meta's rate-limit error codes
 * (4 = app-level, 17 = user-level, 32 = page-level, 613 = custom throttle,
 * 80007 = IG messaging throttle). Anything else fails immediately —
 * retrying a 400 "message outside allowed window" would never succeed.
 */

const RETRYABLE_META_CODES = new Set([4, 17, 32, 613, 80007]);

export class GraphApiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly metaCode?: number,
    public readonly metaSubcode?: number,
  ) {
    super(message);
    this.name = "GraphApiError";
  }

  get retryable(): boolean {
    if (this.httpStatus === 429 || this.httpStatus >= 500) return true;
    return this.metaCode !== undefined && RETRYABLE_META_CODES.has(this.metaCode);
  }
}

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 3, baseDelayMs = 500, maxDelayMs = 8000 }: RetryOptions = {},
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      const retryable =
        err instanceof GraphApiError
          ? err.retryable
          : err instanceof TypeError; // fetch network failure
      if (!retryable || attempt >= retries) throw err;
      // Full jitter keeps concurrent invocations from retrying in lockstep.
      const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const delay = Math.round(cap / 2 + Math.random() * (cap / 2));
      console.warn(
        JSON.stringify({
          level: "warn",
          msg: "retrying after error",
          attempt: attempt + 1,
          delayMs: delay,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      await sleep(delay);
      attempt += 1;
    }
  }
}
