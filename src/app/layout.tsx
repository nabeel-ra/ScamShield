import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'ScamShield — See the scam before it happens', description: 'A synthetic call simulation that makes social-engineering tactics visible. Mock and NVIDIA Nemotron analysis.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
