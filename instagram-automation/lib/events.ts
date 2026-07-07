import { appendRow, EVENTS_COLUMNS, TABS } from "./sheets";
import type { EventLog } from "./types";

/**
 * Structured logging: every action is appended to the Events tab AND written
 * to stdout as JSON (visible in Vercel function logs). A Sheets outage must
 * never break webhook processing, so append failures are swallowed after
 * being logged to stdout.
 */
export async function logEvent(event: EventLog): Promise<void> {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, ...event };
  console.log(JSON.stringify({ level: "info", source: "events", ...entry }));

  const row: Record<(typeof EVENTS_COLUMNS)[number], string> = {
    timestamp,
    event_type: event.type,
    status: event.status ?? "ok",
    ig_user_id: event.igUserId ?? "",
    username: event.username ?? "",
    post_id: event.postId ?? "",
    comment_id: event.commentId ?? "",
    rule_id: event.ruleId ?? "",
    detail: event.detail ?? "",
  };

  try {
    await appendRow(
      TABS.events,
      EVENTS_COLUMNS.map((c) => row[c]),
    );
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        source: "events",
        msg: "failed to append event to sheet",
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}
