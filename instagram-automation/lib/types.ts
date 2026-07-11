/** A row from the Rules tab, parsed into a typed shape. */
export interface Rule {
  /** Value of the rule_id column — referenced from Subscribers and quick-reply payloads. */
  id: string;
  /** IG media ID this rule applies to, or "ANY" to match every post. */
  postId: string;
  /** Lower-cased trigger keywords (comma-separated in the sheet). */
  keywords: string[];
  /** Public comment reply variants (pipe-separated in the sheet); one is picked at random. */
  commentReplies: string[];
  /** Opening DM sent as a Private Reply to the commenter. */
  dmMessage: string;
  /** Whether the subscriber must follow the account before getting the link. */
  requireFollow: boolean;
  /** DM sent when requireFollow is true and the user does not follow yet. */
  followPrompt: string;
  /** Final DM containing the link / deliverable. */
  linkMessage: string;
  /** Optional URL rendered as a tappable button under the final DM. */
  linkUrl: string;
  /** Label of the link button (default "Open link 🔗"). */
  linkButtonLabel: string;
  /** Label of the quick-reply button under the opening DM (default "Send me the link"). */
  dmButtonLabel: string;
  /** Label of the quick-reply button under the follow prompt (default "I'm following ✅"). */
  followButtonLabel: string;
  /** Rules with enabled != TRUE are ignored. */
  enabled: boolean;
  /** 1-based row number in the sheet (for debugging/log messages). */
  rowNumber: number;
}

/** Lifecycle stages of a subscriber, stored in the Subscribers `stage` column. */
export type SubscriberStage = "new" | "awaiting_follow" | "link_sent";

export interface Subscriber {
  igUserId: string;
  username: string;
  ruleId: string;
  stage: SubscriberStage;
  postId: string;
  lastCommentId: string;
  createdAt: string;
  updatedAt: string;
  /** 1-based row number in the Subscribers sheet; used for in-place updates. */
  rowNumber: number;
}

export type EventType =
  | "comment_received"
  | "comment_ignored"
  | "rule_matched"
  | "no_rule_matched"
  | "public_reply_posted"
  | "private_reply_sent"
  | "dm_sent"
  | "follow_check"
  | "message_received"
  | "stage_changed"
  | "error";

export interface EventLog {
  type: EventType;
  igUserId?: string;
  username?: string;
  postId?: string;
  commentId?: string;
  ruleId?: string;
  detail?: string;
  status?: "ok" | "skipped" | "failed";
}

/** Incoming comment, normalized from the webhook payload. */
export interface IncomingComment {
  commentId: string;
  text: string;
  postId: string;
  commenterId: string;
  commenterUsername: string;
  parentId?: string;
  /** Unix epoch ms when Meta emitted the event (used for the 7-day private-reply window). */
  eventTimeMs: number;
}

/** Incoming DM (text message or quick-reply tap), normalized from the webhook payload. */
export interface IncomingMessage {
  senderId: string;
  text: string;
  quickReplyPayload?: string;
}

export interface QuickReply {
  title: string;
  payload: string;
}

/** A tappable web-link button (Messenger button template). */
export interface UrlButton {
  title: string;
  url: string;
}
