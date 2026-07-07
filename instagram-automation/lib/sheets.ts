import { google, type sheets_v4 } from "googleapis";
import { env } from "./env";
import type { Rule } from "./types";

/**
 * Google Sheets access layer.
 *
 * Tab and column names live in the constants below — PLACEHOLDERS until we
 * wire in the real sheet. Column lookup is done by header name
 * (case-insensitive), so column order in the sheet does not matter.
 */

export const TABS = {
  rules: "Rules",
  events: "Events",
  subscribers: "Subscribers",
} as const;

/** Expected header names in the Rules tab (row 1). */
export const RULES_COLUMNS = {
  id: "rule_id",
  postId: "post_id",
  keywords: "keywords",
  commentReplies: "comment_replies",
  dmMessage: "dm_message",
  requireFollow: "require_follow",
  followPrompt: "follow_prompt",
  linkMessage: "link_message",
  enabled: "enabled",
} as const;

/** Expected header names in the Subscribers tab (row 1). */
export const SUBSCRIBERS_COLUMNS = {
  igUserId: "ig_user_id",
  username: "username",
  ruleId: "rule_id",
  stage: "stage",
  postId: "post_id",
  lastCommentId: "last_comment_id",
  createdAt: "created_at",
  updatedAt: "updated_at",
} as const;

/** Column order used when appending to the Events tab. */
export const EVENTS_COLUMNS = [
  "timestamp",
  "event_type",
  "status",
  "ig_user_id",
  "username",
  "post_id",
  "comment_id",
  "rule_id",
  "detail",
] as const;

let sheetsClient: sheets_v4.Sheets | null = null;

export function getSheets(): sheets_v4.Sheets {
  if (!sheetsClient) {
    const key = env.googleServiceAccountKey;
    const auth = new google.auth.JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    sheetsClient = google.sheets({ version: "v4", auth });
  }
  return sheetsClient;
}

/** Read a whole tab; returns [] when the tab is empty. */
export async function readTab(tab: string): Promise<string[][]> {
  const res = await getSheets().spreadsheets.values.get({
    spreadsheetId: env.googleSheetId,
    range: tab,
  });
  return (res.data.values as string[][]) ?? [];
}

export async function appendRow(tab: string, row: (string | number)[]): Promise<void> {
  await getSheets().spreadsheets.values.append({
    spreadsheetId: env.googleSheetId,
    range: tab,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

/** Overwrite a full row (1-based rowNumber) in a tab. */
export async function updateRow(
  tab: string,
  rowNumber: number,
  row: (string | number)[],
): Promise<void> {
  await getSheets().spreadsheets.values.update({
    spreadsheetId: env.googleSheetId,
    range: `${tab}!A${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });
}

/** Map header names (lower-cased) to their 0-based column index. */
export function headerIndex(headerRow: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((name, i) => {
    const key = name.trim().toLowerCase();
    if (key && !map.has(key)) map.set(key, i);
  });
  return map;
}

export function cell(row: string[], idx: Map<string, number>, column: string): string {
  const i = idx.get(column.toLowerCase());
  return i === undefined ? "" : (row[i] ?? "").trim();
}

export function isTruthyCell(value: string): boolean {
  return ["true", "yes", "1", "y"].includes(value.trim().toLowerCase());
}

// ── Rules cache ──────────────────────────────────────────────────────────────

const RULES_CACHE_TTL_MS = 60_000;

let rulesCache: { rules: Rule[]; fetchedAt: number } | null = null;

function parseRules(values: string[][]): Rule[] {
  if (values.length < 2) return [];
  const idx = headerIndex(values[0]);
  const rules: Rule[] = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.every((c) => !c || !c.trim())) continue;

    const keywords = cell(row, idx, RULES_COLUMNS.keywords)
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    const commentReplies = cell(row, idx, RULES_COLUMNS.commentReplies)
      .split("|")
      .map((r) => r.trim())
      .filter(Boolean);

    rules.push({
      id: cell(row, idx, RULES_COLUMNS.id) || `row_${i + 1}`,
      postId: cell(row, idx, RULES_COLUMNS.postId) || "ANY",
      keywords,
      commentReplies,
      dmMessage: cell(row, idx, RULES_COLUMNS.dmMessage),
      requireFollow: isTruthyCell(cell(row, idx, RULES_COLUMNS.requireFollow)),
      followPrompt: cell(row, idx, RULES_COLUMNS.followPrompt),
      linkMessage: cell(row, idx, RULES_COLUMNS.linkMessage),
      enabled: isTruthyCell(cell(row, idx, RULES_COLUMNS.enabled) || "true"),
      rowNumber: i + 1,
    });
  }
  return rules;
}

/**
 * Rules, cached in memory for 60s. Serverless note: each warm lambda instance
 * keeps its own cache; cold starts refetch. That is fine — the point is to
 * avoid hammering the Sheets API on comment bursts.
 */
export async function getRules(): Promise<Rule[]> {
  const now = Date.now();
  if (rulesCache && now - rulesCache.fetchedAt < RULES_CACHE_TTL_MS) {
    return rulesCache.rules;
  }
  const values = await readTab(TABS.rules);
  const rules = parseRules(values);
  rulesCache = { rules, fetchedAt: now };
  return rules;
}

/** Test hook / manual invalidation. */
export function invalidateRulesCache(): void {
  rulesCache = null;
}
