import { env } from "./env";
import { logEvent } from "./events";
import {
  checkFollowStatus,
  PRIVATE_REPLY_WINDOW_MS,
  replyToComment,
  sendDirectMessage,
  sendPrivateReply,
} from "./instagram";
import { findMatchingRule, getRuleById, pickReplyVariant } from "./rules";
import { findSubscriber, setStage, upsertSubscriber } from "./subscribers";
import type { IncomingComment, IncomingMessage, Rule, Subscriber } from "./types";

/**
 * Orchestration: comment → public reply → opening DM → (follow gate) → link.
 *
 * Quick-reply payload format: "<ACTION>:<rule_id>"
 */
const PAYLOAD_FOLLOW_DONE = "FOLLOW_DONE";
const PAYLOAD_GET_LINK = "GET_LINK";

function parsePayload(payload: string): { action: string; ruleId: string } | null {
  const sep = payload.indexOf(":");
  if (sep === -1) return null;
  return { action: payload.slice(0, sep), ruleId: payload.slice(sep + 1) };
}

// ── Comment flow ─────────────────────────────────────────────────────────────

export async function handleComment(comment: IncomingComment): Promise<void> {
  const base = {
    igUserId: comment.commenterId,
    username: comment.commenterUsername,
    postId: comment.postId,
    commentId: comment.commentId,
  };

  // Never react to our own comments (including the replies we post).
  if (comment.commenterId === env.igBusinessAccountId) {
    return;
  }

  await logEvent({ type: "comment_received", ...base, detail: comment.text });

  const rule = await findMatchingRule(comment.postId, comment.text);
  if (!rule) {
    await logEvent({ type: "no_rule_matched", ...base, status: "skipped" });
    return;
  }
  await logEvent({
    type: "rule_matched",
    ...base,
    ruleId: rule.id,
    detail: `matched keywords of rule ${rule.id} (row ${rule.rowNumber})`,
  });

  // 1. Public reply under the comment (random variant).
  const publicReply = pickReplyVariant(rule);
  if (publicReply) {
    try {
      await replyToComment(comment.commentId, publicReply);
      await logEvent({ type: "public_reply_posted", ...base, ruleId: rule.id, detail: publicReply });
    } catch (err) {
      await logEvent({
        type: "error",
        ...base,
        ruleId: rule.id,
        status: "failed",
        detail: `public reply failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      // Keep going — the DM is the part that matters.
    }
  }

  // 2. Opening DM via Private Reply — only inside the 7-day window.
  if (Date.now() - comment.eventTimeMs > PRIVATE_REPLY_WINDOW_MS) {
    await logEvent({
      type: "private_reply_sent",
      ...base,
      ruleId: rule.id,
      status: "skipped",
      detail: "comment older than 7-day private reply window",
    });
    return;
  }

  try {
    if (rule.requireFollow) {
      await runFollowGate(comment, rule);
    } else {
      await sendOpeningDm(comment, rule);
    }
  } catch (err) {
    await logEvent({
      type: "error",
      ...base,
      ruleId: rule.id,
      status: "failed",
      detail: `DM flow failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}

/** No follow gate: opening DM with a quick-reply button leading to the link. */
async function sendOpeningDm(comment: IncomingComment, rule: Rule): Promise<void> {
  if (rule.dmMessage) {
    await sendPrivateReply(comment.commentId, rule.dmMessage, [
      { title: "Send it! 🔗", payload: `${PAYLOAD_GET_LINK}:${rule.id}` },
    ]);
    await logEvent({
      type: "private_reply_sent",
      igUserId: comment.commenterId,
      username: comment.commenterUsername,
      postId: comment.postId,
      commentId: comment.commentId,
      ruleId: rule.id,
      detail: rule.dmMessage,
    });
    await persist(comment, rule, "new");
  } else {
    // No opening message configured — deliver the link straight away.
    await sendPrivateReply(comment.commentId, rule.linkMessage);
    await logEvent({
      type: "private_reply_sent",
      igUserId: comment.commenterId,
      username: comment.commenterUsername,
      postId: comment.postId,
      commentId: comment.commentId,
      ruleId: rule.id,
      detail: rule.linkMessage,
    });
    await persist(comment, rule, "link_sent");
  }
}

/** Follow gate: check follow status, branch to link or "please follow first". */
async function runFollowGate(comment: IncomingComment, rule: Rule): Promise<void> {
  const following = await checkFollowStatus(comment.commenterId);
  await logEvent({
    type: "follow_check",
    igUserId: comment.commenterId,
    username: comment.commenterUsername,
    postId: comment.postId,
    commentId: comment.commentId,
    ruleId: rule.id,
    detail: `is_user_follow_business=${following === null ? "unknown" : following}`,
  });

  if (following === true) {
    await sendPrivateReply(comment.commentId, rule.linkMessage);
    await logEvent({
      type: "private_reply_sent",
      igUserId: comment.commenterId,
      username: comment.commenterUsername,
      postId: comment.postId,
      commentId: comment.commentId,
      ruleId: rule.id,
      detail: rule.linkMessage,
    });
    await persist(comment, rule, "link_sent");
  } else {
    const prompt =
      rule.followPrompt ||
      "Almost there! Follow us first, then tap the button below and I'll send it right over. 🙌";
    await sendPrivateReply(comment.commentId, prompt, [
      { title: "I'm following ✅", payload: `${PAYLOAD_FOLLOW_DONE}:${rule.id}` },
    ]);
    await logEvent({
      type: "private_reply_sent",
      igUserId: comment.commenterId,
      username: comment.commenterUsername,
      postId: comment.postId,
      commentId: comment.commentId,
      ruleId: rule.id,
      detail: prompt,
    });
    await persist(comment, rule, "awaiting_follow");
  }
}

async function persist(
  comment: IncomingComment,
  rule: Rule,
  stage: Subscriber["stage"],
): Promise<void> {
  await upsertSubscriber({
    igUserId: comment.commenterId,
    username: comment.commenterUsername,
    ruleId: rule.id,
    stage,
    postId: comment.postId,
    lastCommentId: comment.commentId,
  });
  await logEvent({
    type: "stage_changed",
    igUserId: comment.commenterId,
    username: comment.commenterUsername,
    postId: comment.postId,
    commentId: comment.commentId,
    ruleId: rule.id,
    detail: `stage=${stage}`,
  });
}

// ── DM flow (user replies / quick-reply taps) ────────────────────────────────

export async function handleMessage(message: IncomingMessage): Promise<void> {
  if (message.senderId === env.igBusinessAccountId) return;

  await logEvent({
    type: "message_received",
    igUserId: message.senderId,
    detail: message.quickReplyPayload
      ? `quick_reply=${message.quickReplyPayload}`
      : message.text,
  });

  const subscriber = await findSubscriber(message.senderId);
  const payload = message.quickReplyPayload
    ? parsePayload(message.quickReplyPayload)
    : null;

  // Rule to act on: quick-reply payload wins, else the subscriber's saved rule.
  const ruleId = payload?.ruleId ?? subscriber?.ruleId;
  if (!ruleId) return; // Someone not in a flow DMed us — leave it for a human.
  const rule = await getRuleById(ruleId);
  if (!rule) {
    await logEvent({
      type: "error",
      igUserId: message.senderId,
      ruleId,
      status: "failed",
      detail: "subscriber references a rule_id no longer present in Rules",
    });
    return;
  }

  const effectiveStage = subscriber?.stage ?? "new";

  // Resume at the right stage instead of restarting.
  if (effectiveStage === "awaiting_follow" || payload?.action === PAYLOAD_FOLLOW_DONE) {
    const following = await checkFollowStatus(message.senderId);
    await logEvent({
      type: "follow_check",
      igUserId: message.senderId,
      ruleId: rule.id,
      detail: `is_user_follow_business=${following === null ? "unknown" : following}`,
    });

    if (following === true) {
      await sendDirectMessage(message.senderId, rule.linkMessage);
      await logEvent({
        type: "dm_sent",
        igUserId: message.senderId,
        ruleId: rule.id,
        detail: rule.linkMessage,
      });
      if (subscriber) await setStage(subscriber, "link_sent");
    } else {
      const prompt =
        rule.followPrompt ||
        "Hmm, I can't see the follow yet — make sure you're following, then tap again!";
      await sendDirectMessage(message.senderId, prompt, [
        { title: "I'm following ✅", payload: `${PAYLOAD_FOLLOW_DONE}:${rule.id}` },
      ]);
      await logEvent({
        type: "dm_sent",
        igUserId: message.senderId,
        ruleId: rule.id,
        detail: prompt,
      });
    }
    return;
  }

  if (effectiveStage === "link_sent") {
    // They already got it — resend rather than leaving them hanging.
    await sendDirectMessage(message.senderId, rule.linkMessage);
    await logEvent({
      type: "dm_sent",
      igUserId: message.senderId,
      ruleId: rule.id,
      detail: `resend: ${rule.linkMessage}`,
    });
    return;
  }

  // stage "new" (or GET_LINK tap): deliver the link.
  await sendDirectMessage(message.senderId, rule.linkMessage);
  await logEvent({
    type: "dm_sent",
    igUserId: message.senderId,
    ruleId: rule.id,
    detail: rule.linkMessage,
  });
  if (subscriber) await setStage(subscriber, "link_sent");
}
