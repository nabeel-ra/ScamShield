'use client';

import { useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Check, Headset, HeartHandshake, Landmark, ShieldCheck, Building2 } from 'lucide-react';
import { scenarios, type Scenario } from '@/lib/scenarios';
const icons = { bank: Landmark, government: Building2, support: Headset, recruiter: BriefcaseBusiness, family: HeartHandshake };

export function ScenarioPicker({ initialId, onSelect }: { initialId: string; onSelect: (scenario: Scenario) => void }) {
  const [selected, setSelected] = useState(initialId);
  const choice = scenarios.find(item => item.id === selected)!;
  return <main className="scenario-picker">
    <a className="brand" href="/" aria-label="ScamShield home"><span className="brand-icon"><ShieldCheck size={23} /></span>Scam<span>Shield</span></a>
    <div className="picker-heading"><div className="eyebrow">FIVE STORIES. REAL WARNING SIGNS.</div><h1>Choose the call.<br /><span>Learn to spot the pressure.</span></h1><p>Explore a synthetic scam conversation. Follow the voice, inspect the evidence, and watch risk build.</p></div>
    <div className="scenario-options" role="group" aria-label="Choose a scam scenario">{scenarios.map(item => {
      const Icon = icons[item.icon];
      return <button className={`scenario-option ${selected === item.id ? 'chosen' : ''}`} key={item.id} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>
        <span className="option-top"><span className="scenario-icon"><Icon size={24} /></span><span className="scenario-tag">{item.difficulty}</span><span className="option-check">{selected === item.id && <Check size={14} />}</span></span>
        <strong>{item.title}</strong><p>{item.description}</p><span className="option-meta">{item.lines.length} caller lines · {item.duration}s silent demo</span>
      </button>;
    })}</div>
    <div className="picker-footer"><span><ShieldCheck size={17} /> Fictional calls. No microphone or personal data needed.</span><button className="primary-button" onClick={() => onSelect(choice)}>Continue with {choice.title}<ArrowRight size={17} /></button></div>
    <p className="picker-note">Next: choose silent or ElevenLabs voice, then start the call. Mock and live Nemotron analysis are available for every scenario.</p>
  </main>;
}
