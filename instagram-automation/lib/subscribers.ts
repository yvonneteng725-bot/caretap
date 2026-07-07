import {
  appendRow,
  cell,
  headerIndex,
  readTab,
  SUBSCRIBERS_COLUMNS,
  TABS,
  updateRow,
} from "./sheets";
import type { Subscriber, SubscriberStage } from "./types";

/**
 * Subscriber state machine, persisted in the Subscribers tab.
 *
 * stage transitions:
 *   new             → link_sent        (no follow gate, user replied / link delivered)
 *   new             → awaiting_follow  (follow gate, user not following yet)
 *   awaiting_follow → link_sent        (follow confirmed)
 *
 * State reads are NOT cached — stage must be fresh so a user replying
 * minutes later resumes at the right step.
 *
 * Scale note: lookup is a full-tab read, fine for thousands of rows. If the
 * tab grows past that, move Subscribers to a real KV store.
 */

const STAGES: SubscriberStage[] = ["new", "awaiting_follow", "link_sent"];

function parseStage(value: string): SubscriberStage {
  const v = value.trim().toLowerCase() as SubscriberStage;
  return STAGES.includes(v) ? v : "new";
}

export async function findSubscriber(igUserId: string): Promise<Subscriber | null> {
  const values = await readTab(TABS.subscribers);
  if (values.length < 2) return null;
  const idx = headerIndex(values[0]);

  // Scan bottom-up so the most recent row wins if duplicates ever appear.
  for (let i = values.length - 1; i >= 1; i--) {
    const row = values[i];
    if (!row) continue;
    if (cell(row, idx, SUBSCRIBERS_COLUMNS.igUserId) === igUserId) {
      return {
        igUserId,
        username: cell(row, idx, SUBSCRIBERS_COLUMNS.username),
        ruleId: cell(row, idx, SUBSCRIBERS_COLUMNS.ruleId),
        stage: parseStage(cell(row, idx, SUBSCRIBERS_COLUMNS.stage)),
        postId: cell(row, idx, SUBSCRIBERS_COLUMNS.postId),
        lastCommentId: cell(row, idx, SUBSCRIBERS_COLUMNS.lastCommentId),
        createdAt: cell(row, idx, SUBSCRIBERS_COLUMNS.createdAt),
        updatedAt: cell(row, idx, SUBSCRIBERS_COLUMNS.updatedAt),
        rowNumber: i + 1,
      };
    }
  }
  return null;
}

function toRow(sub: Subscriber, columnOrder: string[]): string[] {
  const byColumn: Record<string, string> = {
    [SUBSCRIBERS_COLUMNS.igUserId]: sub.igUserId,
    [SUBSCRIBERS_COLUMNS.username]: sub.username,
    [SUBSCRIBERS_COLUMNS.ruleId]: sub.ruleId,
    [SUBSCRIBERS_COLUMNS.stage]: sub.stage,
    [SUBSCRIBERS_COLUMNS.postId]: sub.postId,
    [SUBSCRIBERS_COLUMNS.lastCommentId]: sub.lastCommentId,
    [SUBSCRIBERS_COLUMNS.createdAt]: sub.createdAt,
    [SUBSCRIBERS_COLUMNS.updatedAt]: sub.updatedAt,
  };
  return columnOrder.map((name) => byColumn[name.trim().toLowerCase()] ?? "");
}

/**
 * Insert or update a subscriber row, keyed by ig_user_id.
 * Returns the persisted subscriber (with its sheet row number).
 */
export async function upsertSubscriber(
  input: Omit<Subscriber, "rowNumber" | "createdAt" | "updatedAt"> &
    Partial<Pick<Subscriber, "createdAt">>,
): Promise<Subscriber> {
  const now = new Date().toISOString();
  const values = await readTab(TABS.subscribers);
  const headerRow =
    values[0] && values[0].length > 0
      ? values[0]
      : Object.values(SUBSCRIBERS_COLUMNS);
  const idx = headerIndex(headerRow);

  let existingRowNumber: number | null = null;
  let existingCreatedAt = "";
  for (let i = values.length - 1; i >= 1; i--) {
    const row = values[i];
    if (row && cell(row, idx, SUBSCRIBERS_COLUMNS.igUserId) === input.igUserId) {
      existingRowNumber = i + 1;
      existingCreatedAt = cell(row, idx, SUBSCRIBERS_COLUMNS.createdAt);
      break;
    }
  }

  const subscriber: Subscriber = {
    ...input,
    createdAt: existingCreatedAt || input.createdAt || now,
    updatedAt: now,
    rowNumber: existingRowNumber ?? values.length + 1,
  };

  const row = toRow(subscriber, headerRow);
  if (existingRowNumber) {
    await updateRow(TABS.subscribers, existingRowNumber, row);
  } else {
    await appendRow(TABS.subscribers, row);
  }
  return subscriber;
}

export async function setStage(
  subscriber: Subscriber,
  stage: SubscriberStage,
): Promise<Subscriber> {
  return upsertSubscriber({ ...subscriber, stage });
}
