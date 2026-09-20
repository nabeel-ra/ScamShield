export type TacticType = 'authority_impersonation' | 'urgency' | 'threat' | 'credential_request' | 'otp_request' | 'payment_request' | 'isolation' | 'safe_account';
export type Detection = { type: TacticType; evidence: string; severity: 'low' | 'medium' | 'critical' };
export const tactics: Record<TacticType, { label: string; weight: number; description: string }> = {
  authority_impersonation: { label: 'Claimed bank authority', weight: 15, description: 'Caller claims a trusted identity. This alone does not establish a scam.' },
  urgency: { label: 'Artificial urgency', weight: 10, description: 'Pressure to act before you can verify the story.' },
  threat: { label: 'Account lock threat', weight: 15, description: 'A negative consequence is used to force compliance.' },
  credential_request: { label: 'Credential request', weight: 25, description: 'Caller asks for private login information.' },
  otp_request: { label: 'Verification code request', weight: 30, description: 'Sharing a one-time code can give someone access to your account.' },
  payment_request: { label: 'Payment request', weight: 30, description: 'Caller requests a transfer or payment.' },
  isolation: { label: 'Pressure to stay on the line', weight: 20, description: 'Caller discourages ending the call to independently verify.' },
  safe_account: { label: '“Safe account” transfer', weight: 30, description: 'Caller asks you to move money to a supposed safe account.' },
};
export type TranscriptLine = { at: number; text: string; detections: Detection[] };
export const scenario: TranscriptLine[] = [
  { at: 2, text: 'Hi, this is David from First National Bank’s fraud department.', detections: [{ type: 'authority_impersonation', evidence: 'First National Bank’s fraud department', severity: 'low' }] },
  { at: 7, text: 'We detected a suspicious $1,200 purchase on your account.', detections: [] },
  { at: 12, text: 'We need to resolve this immediately before the charge becomes permanent.', detections: [{ type: 'urgency', evidence: 'immediately before the charge becomes permanent', severity: 'medium' }] },
  { at: 18, text: 'I just sent you a six-digit verification code.', detections: [] },
  { at: 23, text: 'Please read that code back to me.', detections: [{ type: 'otp_request', evidence: 'Please read that code back to me.', severity: 'critical' }] },
  { at: 29, text: 'Do not hang up or your account may be locked.', detections: [{ type: 'isolation', evidence: 'Do not hang up', severity: 'critical' }, { type: 'threat', evidence: 'your account may be locked', severity: 'critical' }] },
];
export const CALL_DURATION = 35;
export function scoreRisk(detections: Detection[]): number {
  return Math.min(100, [...new Set(detections.map(d => d.type))].reduce((total, type) => total + tactics[type].weight, 0));
}
export function riskLevel(score: number) { return score >= 75 ? 'Critical risk' : score >= 50 ? 'High risk' : score >= 25 ? 'Elevated risk' : score > 0 ? 'Low risk' : 'Awaiting signal'; }
export function safetyAction(detections: Detection[]) {
  if (detections.some(d => d.type === 'otp_request')) return 'Do not share the code. Hang up and call your bank using the number on the back of your card.';
  if (detections.some(d => d.type === 'urgency')) return 'Take a breath. Do not act under pressure. Verify the caller through your bank’s official phone number.';
  return 'Keep personal details private. A claimed bank identity is not proof—verify the caller independently.';
}
export function formatTime(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; }
