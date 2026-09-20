'use client';

import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowDownLeft, ArrowRight, AudioLines, Check, ChevronRight, CircleHelp, Clock3, FileText, Fingerprint, LockKeyhole, Phone, PhoneOff, Play, RotateCcw, Shield, ShieldCheck, ShieldEllipsis, TriangleAlert } from 'lucide-react';
import { Detection, formatTime, riskLevel, safetyAction, scenario, scoreRisk, tactics } from '@/lib/scenario';

import { AnalysisMode, useNemotron } from '@/hooks/use-nemotron';

import { useCall } from '@/hooks/use-call';
function EvidenceText({ text, detections }: { text: string; detections: Detection[] }) {
  if (!detections.length) return <>{text}</>;
  const pattern = new RegExp(`(${detections.map(d => d.evidence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  return <>{text.split(pattern).map((part, i) => detections.some(d => d.evidence === part) ? <mark key={i}>{part}</mark> : part)}</>;
}

export default function Dashboard() {
  const call = useCall();
  const { status, elapsed, lineCount } = call;
  const [showInfo, setShowInfo] = useState(false);
  const [mode, setMode] = useState<AnalysisMode>('mock');
  const [session, setSession] = useState(0);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const analysis = useNemotron(lineCount, elapsed, mode, session);
  const visible = scenario.slice(0, lineCount).map((line, index) => ({ ...line, at: call.voice ? (call.lineTimes[index] ?? 0) : line.at, detections: mode === 'mock' ? line.detections : analysis.detections.filter(d => d.lineIndex === index) }));
  const detections = mode === 'mock' ? visible.flatMap(line => line.detections) : analysis.detections;
  const analysisPending = mode === 'nemotron' && lineCount > analysis.analyzedCount;
  const displayRisk = mode === 'nemotron' && analysis.error ? 'Analysis incomplete' : analysisPending ? 'Analysis pending' : riskLevel(scoreRisk(detections));
  const score = scoreRisk(detections);
  const tone = score >= 50 ? 'danger' : score >= 25 ? 'warning' : 'safe';
  const eventTimes = [...new Set(analysis.detections.map(d => d.detectedAt))];
  const events = mode === 'mock'
    ? visible.filter(line => line.detections.length).map(line => ({ ...line, score: scoreRisk(visible.filter(item => item.at <= line.at).flatMap(item => item.detections)) }))
    : eventTimes.map(at => ({ at, detections: analysis.detections.filter(d => d.detectedAt === at), score: scoreRisk(analysis.detections.filter(d => d.detectedAt <= at)) }));
  useEffect(() => { transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' }); }, [visible.length]);
  function startCall() { setSession(value => value + 1); call.start(); }
  function changeMode(next: AnalysisMode) { if (next === mode) return; setMode(next); setSession(value => value + 1); call.reset(); }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="ScamShield home"><span className="brand-icon"><ShieldCheck size={23} /></span>Scam<span>Shield</span></a>
      <div className="workspace-label">WORKSPACE</div>
      <a href="#dashboard" className="nav-item selected"><Activity size={18} /> Live analysis <span className="nav-dot" /></a>
      <a href="#timeline" className="nav-item"><Clock3 size={18} /> Risk timeline</a>
      <a href="/evaluation" className="nav-item"><FileText size={18} /> Evaluation</a>
      <button className="nav-item" onClick={() => setShowInfo(!showInfo)}><CircleHelp size={18} /> How it works</button>
      <div className="sidebar-bottom"><div className="shield-tile"><Shield size={23} /></div><strong>A little doubt.<br />A lot of protection.</strong><p>Recognize the pressure.<br />Stay in control.</p><div className="build-label"><span /> PHASE 03 · {mode === 'mock' ? 'MOCK DEMO' : 'NEMOTRON'}</div></div>
    </aside>

    <div className="main-shell" id="dashboard">
      <header className="topbar"><div>Workspace <ChevronRight size={14} /><span>Live analysis</span></div><a href="/evaluation" className="private-label">Evaluation <ArrowRight size={13} /></a><span className="private-label"><LockKeyhole size={13} /> Synthetic data only</span></header>
      <main>
        <div className="page-heading"><div><div className="eyebrow">YOUR SECOND LINE OF DEFENSE</div><h1>See the scam.<span> Before it happens.</span></h1><p>Watch a suspicious call unfold. Spot the tactics behind the words.</p></div><span className="demo-badge"><span /> Interactive demo</span></div>
        {showInfo && <section className="info-panel"><strong>From conversation to evidence</strong><p>Synthetic transcript → mock detections or NVIDIA Nemotron JSON classification → validated evidence → deterministic TypeScript score. Each unique tactic adds its weight once, capped at 100. Nemotron receives previous lines for context; it never chooses the score. ElevenLabs voice uses saved clips, with each transcript line appearing when its clip starts. Silent mode remains available.</p><button onClick={() => setShowInfo(false)}>Got it <Check size={14} /></button></section>}
        <div className="scenario-bar"><div className="scenario-icon"><Fingerprint size={22} /></div><div><span className="tiny-label">THE SCENARIO</span><strong>The “bank fraud department” call</strong><p>A familiar name. An urgent problem. A request that changes everything.</p></div><span className="scenario-tag">Financial impersonation</span></div>

        <section className="analysis-toolbar" aria-label="Analysis mode">
          <div className="mode-toggle"><button aria-pressed={mode === 'mock'} onClick={() => changeMode('mock')}>Mock</button><button aria-pressed={mode === 'nemotron'} onClick={() => changeMode('nemotron')}>NVIDIA Nemotron</button></div>
          <p>{mode === 'mock' ? 'Scripted detections · No API calls' : 'Live model classification · Synthetic transcript sent to NVIDIA'}</p>
        </section>
        <section className="analysis-toolbar" aria-label="Caller audio">
          <div className="mode-toggle"><button aria-pressed={!call.voice} onClick={() => { setSession(value => value + 1); call.changeVoice(false); }}>Silent</button><button disabled={!call.audioReady} aria-pressed={call.voice} onClick={() => { setSession(value => value + 1); call.changeVoice(true); }}>ElevenLabs voice</button></div>
          <p>{call.checking ? 'Checking saved audio…' : call.audioReady ? 'Saved synthetic caller voice · No generation during playback' : 'Voice clips not generated yet. Silent demo is ready.'}</p>
          {!call.audioReady && <button className="audio-refresh" onClick={call.refreshAudio}>Check for audio</button>}
          {call.voice && <button className="audio-refresh" aria-pressed={call.muted} onClick={call.toggleMute}>{call.muted ? 'Unmute' : 'Mute'}</button>}
        </section>
        {call.audioError && <div className="analysis-status analysis-error" role="alert">{call.audioError}</div>}
        {mode === 'nemotron' && <div className={`analysis-status ${analysis.error ? 'analysis-error' : ''}`} role={analysis.error ? 'alert' : 'status'}>
          <span>{analysis.error || (analysis.busy ? `Analyzing transcript… ${analysis.analyzedCount}/${lineCount} lines reviewed` : lineCount ? `${analysis.analyzedCount}/${lineCount} lines reviewed · ${analysis.model} · ${(analysis.latencyMs / 1000).toFixed(1)}s last request · ${analysis.attempts} attempt(s)` : 'Ready. Start a call to test your server-side NVIDIA key.')}{analysisPending && !analysis.error ? ' · Score is provisional.' : ''}</span>
          {analysis.error && <button onClick={analysis.retry}>Retry analysis</button>}
        </div>}
        <div className="dashboard-grid">
          <section className="panel call-panel">
            <div className="panel-heading"><h2><AudioLines size={17} /> Call monitor</h2><span className={`status-label ${status === 'active' ? 'live' : ''}`}><span />{status === 'active' ? 'CALL IN PROGRESS' : status === 'ended' ? 'CALL ENDED' : 'READY TO SIMULATE'}</span></div>
            <div className="caller-row"><div className="caller-avatar"><Phone size={23} /><span><ArrowDownLeft size={10} /></span></div><div className="caller-details"><strong>David · “Bank Fraud Team”</strong><span>Unverified caller <i /> Fictional bank scenario</span></div><div className="call-time"><span>{formatTime(elapsed)}</span><small>CALL DURATION</small></div></div>
            <div className="transcript-heading"><span>LIVE TRANSCRIPT</span><span><span className={`little-dot ${status === 'active' ? 'pulse' : ''}`} /> {status === 'active' ? 'Receiving transcript' : 'Scripted simulation'}</span></div>
            <div className="transcript" ref={transcriptRef} role="log" aria-label="Call transcript" aria-live="polite">
              {visible.length === 0 ? <div className="transcript-empty"><div className="waveform">{[13, 25, 38, 22, 46, 32, 19, 38, 26, 13].map((height, i) => <span key={i} style={{ height }} />)}</div><h3>{status === 'active' ? 'Connecting the simulated call…' : 'Every word tells a story.'}</h3><p>Start the call to follow the conversation<br />and see warning signs appear in real time.</p><span>{call.voice ? 'ElevenLabs caller voice · No microphone needed' : '35-second silent demo · No microphone needed'}</span></div> : visible.map((line, i) => <div className="transcript-line" key={line.at}><div className="line-meta"><span>CALLER</span><time>{formatTime(line.at)}</time></div><p><EvidenceText text={line.text} detections={line.detections} /></p>{line.detections.length > 0 && <div className="line-tags">{line.detections.map(d => <span key={d.type} className={d.severity === 'critical' ? 'critical' : ''}><TriangleAlert size={11} />{tactics[d.type].label}</span>)}</div>}{i === visible.length - 1 && status === 'active' && <div className="typing"><span /><span /><span /></div>}</div>)}
            </div>
            <div className="call-controls"><span><ShieldCheck size={14} /> Safe to explore. All dialogue is synthetic.</span>{status === 'active' ? <button className="end-button" onClick={call.end}><PhoneOff size={15} /> End call</button> : <button className="primary-button" onClick={startCall}>{status === 'ended' ? <RotateCcw size={15} /> : <Play size={15} fill="currentColor" />}{status === 'ended' ? 'Replay call' : 'Start call'}<ArrowRight size={16} /></button>}</div>
          </section>

          <section className={`panel risk-panel ${tone}`}>
            <div className="panel-heading"><h2><ShieldEllipsis size={18} /> Risk analysis</h2><span className="mock-chip">{mode === 'mock' ? 'MOCK ENGINE' : 'NEMOTRON + RULES'}</span></div>
            <div className="risk-gauge" aria-label={`Risk score ${score} out of 100, ${displayRisk}`}><svg viewBox="0 0 240 145" aria-hidden="true"><path className="gauge-track" d="M 25 120 A 95 95 0 0 1 215 120" /><path className="gauge-fill" d="M 25 120 A 95 95 0 0 1 215 120" pathLength="100" strokeDasharray={`${score} 100`} /></svg><div className="score"><strong>{score}</strong><span>/ 100</span></div><span className="gauge-min">0</span><span className="gauge-max">100</span></div>
            <div className="risk-caption"><span className="risk-pill"><span />{displayRisk}</span><p>{mode === 'nemotron' && analysis.error ? 'Only previously validated signals are shown.' : analysisPending ? 'Waiting for validated model results.' : score >= 75 ? 'Multiple tactics. One clear warning.' : score >= 50 ? 'A sensitive code request changes the picture.' : score >= 25 ? 'Pressure is building. Stay alert.' : score > 0 ? 'A claimed identity needs verification.' : 'Listening for the first warning sign.'}</p></div>
            <div className="tactics-heading"><h3>Detected tactics</h3><span>{detections.length.toString().padStart(2, '0')}</span></div>
            <div className="tactic-list" aria-live="polite">{detections.length ? detections.map(d => <div className={`tactic-card ${d.severity === 'critical' ? 'critical' : ''}`} key={d.type}><div><TriangleAlert size={14} /><strong>{tactics[d.type].label}</strong><span>+{tactics[d.type].weight}</span></div><p>{tactics[d.type].description}</p></div>) : <div className="tactics-empty"><ShieldCheck size={22} /><p>No tactics detected yet.<br /><span>{mode === 'nemotron' ? 'Only validated model results appear here.' : 'Signals will appear as the call progresses.'}</span></p></div>}</div>
            <div className="engine-note"><Activity size={12} /> Rule-based scoring · Each tactic counted once</div>
          </section>
        </div>

        <section className={`action-panel ${tone}`} aria-live="polite"><div className="action-icon">{score >= 50 ? <Shield size={24} /> : <ShieldCheck size={24} />}</div><div><span className="tiny-label">{score >= 50 ? 'RECOMMENDED SAFETY ACTION' : 'STAY ONE STEP AHEAD'}</span><h3>{score >= 50 ? 'Your code is yours. Keep it that way.' : score >= 25 ? 'Pause the pressure. Verify the story.' : 'Trust is earned, not announced.'}</h3><p>{safetyAction(detections)}</p></div><span className="action-badge">{score >= 50 ? 'ACT WITH CAUTION' : 'SAFETY FIRST'}</span></section>

        <section className="panel timeline-panel" id="timeline"><div className="panel-heading"><h2><Activity size={17} /> Risk timeline</h2><span className="muted">{mode === 'mock' ? 'The moments that matter' : 'Time detected · may lag the transcript'}</span></div><div className="timeline">{events.length ? events.map((event, i) => <div className={`timeline-event ${event.score >= 50 ? 'critical' : ''}`} key={event.at}><div className="timeline-top"><span className="timeline-dot" /><time>{formatTime(event.at)}</time><strong>{event.score}<small> / 100</small></strong></div><h4>{event.detections.map(d => tactics[d.type].label).join(' + ')}</h4><p>+{event.score - (events[i - 1]?.score ?? 0)} risk points</p><blockquote>“{event.detections.map(d => d.evidence).join(' … ')}”</blockquote></div>) : <div className="timeline-empty"><Clock3 size={18} /><span>Every increase has a reason. Start a call to trace the evidence.</span><span>{call.voice ? 'Audio-synchronized' : '00:00 — 00:35'}</span></div>}</div></section>
        {status === 'ended' && <section className="summary panel"><div><FileText size={22} /><h2>Call summary</h2><span>{analysis.error ? 'Analysis incomplete' : analysisPending ? 'Finishing analysis…' : !call.completed ? 'Ended early' : 'Simulation complete'}</span></div><p>In {elapsed} seconds, this simulation surfaced <strong>{detections.length} {detections.length === 1 ? 'tactic' : 'tactics'}</strong> and reached <strong>{score}/100 risk</strong>. {detections.some(d => d.type === 'otp_request') ? 'The turning point was the request to share a verification code.' : 'Review the evidence above to see which signals appeared.'}</p><p className="muted">{mode === 'mock' ? 'These are scripted detections, not a judgment about a real caller.' : 'These are model classifications of a synthetic call, not proof of fraud. The score includes validated tactics accumulated so far.'} A low score does not establish that a call is safe.</p></section>}
        <footer><span><ShieldCheck size={14} /> Built to make manipulation visible.</span><span>ScamShield <i /> Phase 3 prototype <i /> No real calls or personal data</span></footer>
      </main>
    </div>
  </div>;
}
