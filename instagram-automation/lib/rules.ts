import { getRules } from "./sheets";
import type { Rule } from "./types";

/**
 * Rule matching: a rule matches an incoming comment when
 *   1. it is enabled,
 *   2. its post_id equals the comment's media ID OR is "ANY", and
 *   3. the comment text contains at least one of its keywords
 *      (case-insensitive substring match).
 *
 * Post-specific rules win over "ANY" rules; among equals, the first sheet
 * row wins. Returns the single best match (one comment triggers one flow).
 */
export function matchRule(rules: Rule[], postId: string, commentText: string): Rule | null {
  const text = commentText.toLowerCase();

  const candidates = rules.filter((rule) => {
    if (!rule.enabled || rule.keywords.length === 0) return false;
    const postMatches =
      rule.postId.toUpperCase() === "ANY" || rule.postId === postId;
    if (!postMatches) return false;
    return rule.keywords.some((keyword) => text.includes(keyword));
  });

  if (candidates.length === 0) return null;
  const specific = candidates.find((r) => r.postId.toUpperCase() !== "ANY");
  return specific ?? candidates[0];
}

export async function findMatchingRule(
  postId: string,
  commentText: string,
): Promise<Rule | null> {
  const rules = await getRules();
  return matchRule(rules, postId, commentText);
}

export async function getRuleById(ruleId: string): Promise<Rule | null> {
  const rules = await getRules();
  return rules.find((r) => r.id === ruleId) ?? null;
}

export function pickReplyVariant(rule: Rule): string | null {
  if (rule.commentReplies.length === 0) return null;
  return rule.commentReplies[Math.floor(Math.random() * rule.commentReplies.length)];
}
