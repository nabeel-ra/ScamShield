import { Detection, scoreRisk, TacticType } from '../scenario';
export const positiveThreshold = 25;
export const baselineVersion = 'keywords-v1';
// Deliberately simple: no context, negation, or paraphrase handling. Rules frozen before inference.
export const keywordRules: { type: TacticType; pattern: RegExp }[] = [
  { type: 'authority_impersonation', pattern: /\b(bank|fraud department|tax|police|manager)\b/i },
  { type: 'urgency', pattern: /\b(immediately|urgent|urgency|right now|ten minutes)\b/i },
  { type: 'threat', pattern: /\b(locked|arrest|disconnected|permanent)\b/i },
  { type: 'credential_request', pattern: /\b(password|pin|security code|card number)\b/i },
  { type: 'otp_request', pattern: /\b(verification code|six-digit|one-time passcode)\b/i },
  { type: 'payment_request', pattern: /\b(pay|payment|wire|gift cards|cryptocurrency|transfer)\b/i },
  { type: 'isolation', pattern: /\b(do not hang up|stay on the line|do not tell|keep .{0,30}secret)\b/i },
  { type: 'safe_account', pattern: /\bsafe account\b/i },
];
export function keywordBaseline(lines: string[]) {
  const techniques: Detection[] = keywordRules.flatMap(rule => {
    const evidence = lines.find(line => rule.pattern.test(line));
    return evidence ? [{ type: rule.type, evidence, severity: 'medium' as const }] : [];
  });
  const score = scoreRisk(techniques);
  return { techniques, score, predictedScam: score >= positiveThreshold };
}
export function metrics(rows: { actual: boolean; predicted: boolean }[]) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const row of rows) {
    if (row.actual && row.predicted) tp++;
    else if (!row.actual && row.predicted) fp++;
    else if (!row.actual && !row.predicted) tn++;
    else fn++;
  }
  return { count: rows.length, tp, fp, tn, fn, precision: tp + fp ? tp / (tp + fp) : null, recall: tp + fn ? tp / (tp + fn) : null, f1: 2 * tp + fp + fn ? 2 * tp / (2 * tp + fp + fn) : null };
}
