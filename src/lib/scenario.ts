export type TacticType = 'authority_impersonation' | 'urgency' | 'threat' | 'credential_request' | 'otp_request' | 'payment_request' | 'isolation' | 'safe_account';
export type Detection = { type: TacticType; evidence: string; severity: 'low' | 'medium' | 'critical' };
export const tactics: Record<TacticType, { label: string; weight: number; description: string }> = {
  authority_impersonation: { label: 'Claimed trusted identity', weight: 15, description: 'Caller claims a trusted identity. This alone does not establish a scam.' },
  urgency: { label: 'Artificial urgency', weight: 10, description: 'Pressure to act before you can verify the story.' },
  threat: { label: 'Threat of consequences', weight: 15, description: 'A negative consequence is used to force compliance.' },
  credential_request: { label: 'Credential request', weight: 25, description: 'Caller asks for private login information.' },
  otp_request: { label: 'Verification code request', weight: 30, description: 'Sharing a one-time code can give someone access to your account.' },
  payment_request: { label: 'Payment request', weight: 30, description: 'Caller requests a transfer or payment.' },
  isolation: { label: 'Isolation pressure', weight: 20, description: 'Caller discourages ending the call to independently verify.' },
  safe_account: { label: '“Safe account” transfer', weight: 30, description: 'Caller asks you to move money to a supposed safe account.' },
};
export type TranscriptLine = { at: number; text: string; detections: Detection[] };
export function scoreRisk(detections: Detection[]): number {
  return Math.min(100, [...new Set(detections.map(d => d.type))].reduce((total, type) => total + tactics[type].weight, 0));
}
export function riskLevel(score: number) { return score >= 75 ? 'Critical risk' : score >= 50 ? 'High risk' : score >= 25 ? 'Elevated risk' : score > 0 ? 'Low risk' : 'Awaiting signal'; }
export function safetyAction(detections: Detection[], verification = 'Hang up and call your bank using the number on the back of your card.') {
  const types = new Set(detections.map(d => d.type));
  const actions = [];
  if (types.has('otp_request')) actions.push('Do not share verification codes.');
  if (types.has('credential_request')) actions.push('Do not share passwords or login details.');
  if (types.has('payment_request') || types.has('safe_account')) actions.push('Do not send money or make a payment based on this call.');
  if (!actions.length) actions.push(types.has('urgency') || types.has('threat') || types.has('isolation') ? 'Pause. Do not act under pressure or secrecy.' : 'Keep personal details private and verify the caller independently.');
  return `${actions.join(' ')} ${verification}`;
}
export function formatTime(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; }
