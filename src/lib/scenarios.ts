import type { TranscriptLine } from './scenario';

export const bankFraudLines: TranscriptLine[] = [
  { at: 2, text: 'Hi, this is David from First National Bank’s fraud department.', detections: [{ type: 'authority_impersonation', evidence: 'First National Bank’s fraud department', severity: 'low' }] },
  { at: 7, text: 'We detected a suspicious $1,200 purchase on your account.', detections: [] },
  { at: 12, text: 'We need to resolve this immediately before the charge becomes permanent.', detections: [{ type: 'urgency', evidence: 'immediately before the charge becomes permanent', severity: 'medium' }] },
  { at: 18, text: 'I just sent you a six-digit verification code.', detections: [] },
  { at: 23, text: 'Please read that code back to me.', detections: [{ type: 'otp_request', evidence: 'Please read that code back to me.', severity: 'critical' }] },
  { at: 29, text: 'Do not hang up or your account may be locked.', detections: [{ type: 'isolation', evidence: 'Do not hang up', severity: 'critical' }, { type: 'threat', evidence: 'your account may be locked', severity: 'critical' }] },
];


export type Scenario = {
  id: string; title: string; description: string; icon: 'bank' | 'government' | 'support' | 'recruiter' | 'family';
  difficulty: 'Intermediate' | 'Advanced'; caller: string; verification: string; duration: number; manifest: string; lines: TranscriptLine[];
};
export const scenarios: Scenario[] = [
  { id: 'bank-fraud', title: 'Bank Fraud', description: 'A familiar bank name. An urgent charge. A request for your verification code.', icon: 'bank', difficulty: 'Intermediate', caller: 'David · “Bank Fraud Team”', verification: 'Hang up and call your bank using the number on the back of your card.', duration: 35, manifest: '/audio/manifest.json', lines: bankFraudLines },
  { id: 'government', title: 'IRS / Government Impersonation', description: 'An alleged tax debt turns into threats of arrest and a demand for payment.', icon: 'government', difficulty: 'Intermediate', caller: 'Officer Reed · “Tax Enforcement”', verification: 'End the call and verify the claim through the agency’s independently located official contact details.', duration: 38, manifest: '/audio/government.json', lines: [
    { at: 2, text: 'This is Officer Reed with the Internal Revenue Service enforcement division.', detections: [{ type: 'authority_impersonation', evidence: 'Internal Revenue Service enforcement division', severity: 'low' }] },
    { at: 8, text: 'Our records show an unpaid tax balance of eighteen hundred dollars.', detections: [] },
    { at: 14, text: 'A warrant will be issued for your arrest if you refuse to cooperate.', detections: [{ type: 'threat', evidence: 'A warrant will be issued for your arrest', severity: 'critical' }] },
    { at: 20, text: 'You have ten minutes to settle this before we dispatch an officer.', detections: [{ type: 'urgency', evidence: 'You have ten minutes to settle this', severity: 'medium' }] },
    { at: 26, text: 'Buy prepaid gift cards and read me the payment numbers to clear the debt.', detections: [{ type: 'payment_request', evidence: 'Buy prepaid gift cards and read me the payment numbers', severity: 'critical' }] },
    { at: 32, text: 'Do not discuss this investigation with anyone or call another office.', detections: [{ type: 'isolation', evidence: 'Do not discuss this investigation with anyone or call another office', severity: 'critical' }] },
  ] },
  { id: 'tech-support', title: 'Tech Support Scam', description: 'A supposed security technician uses a fake infection to ask for your password.', icon: 'support', difficulty: 'Intermediate', caller: 'Alex · “Device Security Support”', verification: 'Disconnect from the caller and contact support through the device manufacturer’s official website.', duration: 36, manifest: '/audio/tech-support.json', lines: [
    { at: 2, text: 'Hello, I am Alex from Microsoft security support.', detections: [{ type: 'authority_impersonation', evidence: 'Microsoft security support', severity: 'low' }] },
    { at: 7, text: 'Your computer has reported a serious virus infection to our monitoring system.', detections: [] },
    { at: 13, text: 'You must act right now before the infection spreads.', detections: [{ type: 'urgency', evidence: 'You must act right now', severity: 'medium' }] },
    { at: 19, text: 'Tell me your computer login password so I can run the repair.', detections: [{ type: 'credential_request', evidence: 'Tell me your computer login password', severity: 'critical' }] },
    { at: 25, text: 'If you refuse the repair, you will permanently lose all your files.', detections: [{ type: 'threat', evidence: 'you will permanently lose all your files', severity: 'critical' }] },
    { at: 30, text: 'Pay the ninety-nine dollar security fee using the payment link I sent.', detections: [{ type: 'payment_request', evidence: 'Pay the ninety-nine dollar security fee', severity: 'critical' }] },
  ] },
  { id: 'recruiter', title: 'Fake Recruiter Scam', description: 'An attractive remote job hides an upfront equipment fee and a credential trap.', icon: 'recruiter', difficulty: 'Advanced', caller: 'Jordan · “Northstar Recruiting”', verification: 'Verify the opening through the company’s official careers page and independently contact its recruiting team.', duration: 39, manifest: '/audio/recruiter.json', lines: [
    { at: 2, text: 'Hi, this is Jordan, a recruiter with Northstar Systems.', detections: [{ type: 'authority_impersonation', evidence: 'a recruiter with Northstar Systems', severity: 'low' }] },
    { at: 8, text: 'We reviewed your profile and want to offer you a remote analyst position.', detections: [] },
    { at: 14, text: 'The role pays eighty dollars an hour and includes a new laptop.', detections: [] },
    { at: 20, text: 'Send a two hundred dollar equipment deposit to reserve your laptop.', detections: [{ type: 'payment_request', evidence: 'Send a two hundred dollar equipment deposit', severity: 'critical' }] },
    { at: 27, text: 'Give me your email account password so I can activate your employee portal.', detections: [{ type: 'credential_request', evidence: 'Give me your email account password', severity: 'critical' }] },
    { at: 33, text: 'You must accept in the next five minutes or we will give the job to someone else.', detections: [{ type: 'urgency', evidence: 'You must accept in the next five minutes', severity: 'medium' }] },
  ] },
  { id: 'family-emergency', title: 'Family Emergency Scam', description: 'A distressed caller claiming to be family asks for secrecy and emergency money.', icon: 'family', difficulty: 'Advanced', caller: 'Sam · “Family member”', verification: 'Hang up and call your relative on a number you already know. Check with another trusted family member.', duration: 37, manifest: '/audio/family-emergency.json', lines: [
    { at: 2, text: 'It is me, Sam. I sound different because I hurt my nose in an accident.', detections: [] },
    { at: 8, text: 'I am at the police station and I am scared.', detections: [] },
    { at: 14, text: 'Please do not tell anyone in the family or call my usual number.', detections: [{ type: 'isolation', evidence: 'do not tell anyone in the family or call my usual number', severity: 'critical' }] },
    { at: 20, text: 'I need you to send nine hundred dollars by wire transfer for my release.', detections: [{ type: 'payment_request', evidence: 'send nine hundred dollars by wire transfer', severity: 'critical' }] },
    { at: 26, text: 'Please send it immediately, there are only five minutes left.', detections: [{ type: 'urgency', evidence: 'send it immediately, there are only five minutes left', severity: 'medium' }] },
    { at: 31, text: 'If you do not pay, they will keep me locked up all weekend.', detections: [{ type: 'threat', evidence: 'they will keep me locked up all weekend', severity: 'critical' }] },
  ] },
];
export function getScenario(id: unknown) { return scenarios.find(item => item.id === id); }
