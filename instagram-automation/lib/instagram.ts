import { env } from "./env";
import { GraphApiError, withRetry } from "./retry";
import type { QuickReply, UrlButton } from "./types";

/**
 * Instagram Graph API client (Messenger Platform for IG messaging).
 * All calls go through withRetry for exponential backoff on rate limits.
 */

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

/** Private replies must be sent within 7 days of the comment. */
export const PRIVATE_REPLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

interface GraphErrorBody {
  error?: { message?: string; code?: number; error_subcode?: number };
}

async function graphRequest<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown; query?: Record<string, string> } = {},
): Promise<T> {
  return withRetry(async () => {
    const url = new URL(`${GRAPH_BASE}${path}`);
    url.searchParams.set("access_token", env.metaAccessToken);
    for (const [k, v] of Object.entries(init.query ?? {})) {
      url.searchParams.set(k, v);
    }

    const res = await fetch(url, {
      method: init.method ?? "GET",
      headers: init.body ? { "Content-Type": "application/json" } : undefined,
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

    const json = (await res.json().catch(() => ({}))) as T & GraphErrorBody;
    if (!res.ok || json.error) {
      throw new GraphApiError(
        json.error?.message ?? `Graph API HTTP ${res.status}`,
        res.status,
        json.error?.code,
        json.error?.error_subcode,
      );
    }
    return json;
  });
}

/** Post a public reply under a comment. Returns the new comment's ID. */
export async function replyToComment(commentId: string, message: string): Promise<string> {
  const res = await graphRequest<{ id: string }>(`/${commentId}/replies`, {
    method: "POST",
    body: { message },
  });
  return res.id;
}

export interface MessageOptions {
  quickReplies?: QuickReply[];
  /** Rendered via the Messenger "button" template (tappable link buttons). */
  urlButtons?: UrlButton[];
}

function buildMessagePayload(text: string, options: MessageOptions = {}) {
  const { quickReplies, urlButtons } = options;

  const base =
    urlButtons && urlButtons.length > 0
      ? {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text,
              buttons: urlButtons.slice(0, 3).map((b) => ({
                type: "web_url",
                url: b.url,
                title: b.title.slice(0, 20),
              })),
            },
          },
        }
      : { text };

  return quickReplies && quickReplies.length > 0
    ? {
        ...base,
        quick_replies: quickReplies.map((qr) => ({
          content_type: "text",
          title: qr.title.slice(0, 20), // IG quick-reply title limit
          payload: qr.payload,
        })),
      }
    : base;
}

/**
 * Send a Private Reply — the one-time DM you may send in response to a
 * comment, valid for 7 days after the comment was created.
 */
export async function sendPrivateReply(
  commentId: string,
  text: string,
  options?: MessageOptions,
): Promise<void> {
  await graphRequest(`/${env.pageId}/messages`, {
    method: "POST",
    body: {
      recipient: { comment_id: commentId },
      message: buildMessagePayload(text, options),
    },
  });
}

/**
 * Send a standard DM to a user who has already messaged us
 * (inside the 24-hour messaging window).
 */
export async function sendDirectMessage(
  igScopedUserId: string,
  text: string,
  options?: MessageOptions,
): Promise<void> {
  await graphRequest(`/${env.pageId}/messages`, {
    method: "POST",
    body: {
      recipient: { id: igScopedUserId },
      message: buildMessagePayload(text, options),
    },
  });
}

/**
 * Does this user follow our IG business account?
 * Returns null when the API can't tell us (missing permission, stale IGSID);
 * callers should treat null as "not confirmed following".
 */
export async function checkFollowStatus(igScopedUserId: string): Promise<boolean | null> {
  try {
    const res = await graphRequest<{ is_user_follow_business?: boolean }>(
      `/${igScopedUserId}`,
      { query: { fields: "is_user_follow_business" } },
    );
    return typeof res.is_user_follow_business === "boolean"
      ? res.is_user_follow_business
      : null;
  } catch (err) {
    console.warn(
      JSON.stringify({
        level: "warn",
        msg: "follow status check failed",
        igScopedUserId,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return null;
  }
}
