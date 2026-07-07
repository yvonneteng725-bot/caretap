import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { handleComment, handleMessage } from "@/lib/pipeline";
import { verifySignature } from "@/lib/signature";
import type { IncomingComment, IncomingMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Sheets round-trips + Graph API retries can exceed Vercel's default 10s.
export const maxDuration = 60;

/** Meta webhook verification handshake. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === env.verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// ── Webhook payload shapes (only the fields we consume) ─────────────────────

interface CommentChangeValue {
  id?: string;
  text?: string;
  media?: { id?: string };
  from?: { id?: string; username?: string };
  parent_id?: string;
}

interface MessagingEvent {
  sender?: { id?: string };
  message?: {
    text?: string;
    is_echo?: boolean;
    quick_reply?: { payload?: string };
  };
}

interface WebhookEntry {
  time?: number;
  changes?: { field?: string; value?: CommentChangeValue }[];
  messaging?: MessagingEvent[];
}

interface WebhookBody {
  object?: string;
  entry?: WebhookEntry[];
}

/** Comment + message events from Meta. */
export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"), env.metaAppSecret)) {
    console.warn(JSON.stringify({ level: "warn", msg: "webhook signature mismatch" }));
    return new Response("Invalid signature", { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (body.object !== "instagram") {
    return NextResponse.json({ received: true, ignored: body.object });
  }

  // Process before responding: Vercel functions freeze after the response is
  // sent, so returning 200 early would drop the work. Errors are logged and
  // swallowed — a 200 stops Meta from re-delivering a payload we can't handle.
  for (const entry of body.entry ?? []) {
    const eventTimeMs = normalizeEpochMs(entry.time);

    for (const change of entry.changes ?? []) {
      if (change.field !== "comments") continue;
      const comment = normalizeComment(change.value, eventTimeMs);
      if (!comment) continue;
      try {
        await handleComment(comment);
      } catch (err) {
        console.error(
          JSON.stringify({
            level: "error",
            msg: "handleComment failed",
            commentId: comment.commentId,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    }

    for (const messaging of entry.messaging ?? []) {
      const message = normalizeMessage(messaging);
      if (!message) continue;
      try {
        await handleMessage(message);
      } catch (err) {
        console.error(
          JSON.stringify({
            level: "error",
            msg: "handleMessage failed",
            senderId: message.senderId,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}

/** entry.time arrives in seconds for some products and ms for others. */
function normalizeEpochMs(time: number | undefined): number {
  if (!time) return Date.now();
  return time < 1e12 ? time * 1000 : time;
}

function normalizeComment(
  value: CommentChangeValue | undefined,
  eventTimeMs: number,
): IncomingComment | null {
  if (!value?.id || !value.from?.id || !value.media?.id) return null;
  return {
    commentId: value.id,
    text: value.text ?? "",
    postId: value.media.id,
    commenterId: value.from.id,
    commenterUsername: value.from.username ?? "",
    parentId: value.parent_id,
    eventTimeMs,
  };
}

function normalizeMessage(event: MessagingEvent): IncomingMessage | null {
  if (!event.sender?.id || !event.message || event.message.is_echo) return null;
  return {
    senderId: event.sender.id,
    text: event.message.text ?? "",
    quickReplyPayload: event.message.quick_reply?.payload,
  };
}
