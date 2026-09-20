'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, BarChart3, Check, Download, RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { datasetVersion, evaluationCases } from '@/lib/evaluation/dataset';
import { keywordBaseline, metrics, positiveThreshold } from '@/lib/evaluation/metrics';
import type { EvaluationRun } from '@/lib/evaluation/types';
import { tactics } from '@/lib/scenario';

type Filter = 'all' | 'mistakes' | 'scam' | 'legitimate' | 'errors';
const percent = (value: number | null) => value === null ? 'N/A' : `${(value * 100).toFixed(1)}%`;
function MetricCard({ title, value, note }: { title: string; value: string; note: string }) { return <div className="eval-stat"><span>{title}</span><strong>{value}</strong><small>{note}</small></div>; }

export default function EvaluationDashboard() {
  const [run, setRun] = useState<EvaluationRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  async function refresh(signal?: AbortSignal) {
    setLoading(true); setLoadError('');
    try {
      const response = await fetch('/evaluation/latest.json', { cache: 'no-store', signal });
      if (response.status === 404) { setRun(null); return; }
      if (!response.ok) throw new Error('Could not load saved results.');
      const saved = await response.json() as EvaluationRun;
      if (saved.datasetVersion !== datasetVersion || !Array.isArray(saved.rows) || saved.threshold !== positiveThreshold || saved.rows.some(row => !evaluationCases.some(c => c.id === row.id))) throw new Error('Saved results do not match this dataset. Run npm run evaluate again.');
      if (!signal?.aborted) setRun(saved);
    } catch (error) { if (!signal?.aborted) setLoadError(error instanceof Error ? error.message : 'Could not load results.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }
  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort(); }, []);
  const paired = run?.rows.filter(row => row.nemotron.status === 'ok') ?? [];
  const actual = (id: string) => evaluationCases.find(example => example.id === id)!.label === 'scam';
  const baseline = metrics(paired.map(row => ({ actual: actual(row.id), predicted: row.baseline.predictedScam })));
  const nemotron = metrics(paired.flatMap(row => row.nemotron.status === 'ok' ? [{ actual: actual(row.id), predicted: row.nemotron.predictedScam }] : []));
  const fullBaseline = metrics(evaluationCases.map(example => ({ actual: example.label === 'scam', predicted: keywordBaseline(example.lines).predictedScam })));
  const errors = run?.rows.filter(row => row.nemotron.status === 'error').length ?? 0;
  const retryCount = run?.rows.reduce((sum, row) => sum + (row.nemotron.retries?.length ?? 0), 0) ?? 0;
  const recovered = run?.rows.filter(row => row.nemotron.status === 'ok' && (row.nemotron.attempts ?? 1) > 1).length ?? 0;
  const pending = evaluationCases.length - (run?.rows.length ?? 0);
  const filtered = evaluationCases.filter(example => {
    const row = run?.rows.find(row => row.id === example.id);
    if (filter === 'all') return true;
    if (filter === 'scam' || filter === 'legitimate') return example.label === filter;
    if (filter === 'errors') return row?.nemotron.status === 'error';
    return row && (row.baseline.predictedScam !== actual(example.id) || (row.nemotron.status === 'ok' && row.nemotron.predictedScam !== actual(example.id)));
  });

  return <div className="eval-shell">
    <header className="eval-header"><Link className="brand" href="/"><span className="brand-icon"><ShieldCheck size={23} /></span>Scam<span>Shield</span></Link><Link className="back-link" href="/"><ArrowLeft size={14} /> Back to live demo</Link></header>
    <main className="eval-main">
      <div className="page-heading"><div><div className="eyebrow">BEYOND THE DEMO</div><h1>Evidence over assumptions.</h1><p>A measured comparison of keyword rules and Nemotron on synthetic calls.</p></div><span className="demo-badge"><BarChart3 size={13} /> {evaluationCases.length} labeled cases</span></div>
      <section className="eval-intro panel"><div><h2>Can it tell a request from a warning?</h2><p>“Read me the verification code” and “Never read anyone the verification code” share keywords. This test checks whether context makes a difference—including where the model still gets it wrong.</p></div><div className="eval-actions"><button className="audio-refresh" disabled={loading} onClick={() => refresh()}><RefreshCw size={13} /> {loading ? 'Loading…' : 'Refresh results'}</button>{run && <a className="audio-refresh" href="/evaluation/latest.json" download><Download size={13} /> Download run JSON</a>}</div></section>
      {loadError && <div className="analysis-status analysis-error" role="alert">{loadError}</div>}
      {!run && !loading && <div className="analysis-status"><span>No saved Nemotron run yet. Run <code>npm run evaluate</code> in the project terminal, then refresh results. This evaluates 32 cases, with up to three requests per case for transient failures.</span></div>}
      <div className="eval-stat-grid">
        <MetricCard title="MODEL COVERAGE" value={`${paired.length} / ${evaluationCases.length}`} note="Valid responses; same cases compared" />
        <MetricCard title="API / VALIDATION ERRORS" value={String(errors)} note="Excluded from both paired metrics" />
        <MetricCard title="NOT YET ATTEMPTED" value={String(pending)} note={run?.finishedAt ? 'Run complete' : 'Refresh to load saved progress'} />
        <MetricCard title="DECISION CUTOFF" value={`${positiveThreshold} / 100`} note="Same fixed threshold for both detectors" />
      </div>
      <p className="eval-footnote">{retryCount} transient retries recorded · {recovered} cases recovered after retry · Up to {run?.retryPolicy?.maxAttempts ?? 1} attempts per case in this run.</p>
      <section className="panel eval-comparison"><div className="panel-heading"><h2><BarChart3 size={17} /> Paired comparison</h2><span className="muted">Scam is the positive class · {paired.length} shared cases</span></div><div className="eval-table-scroll"><table><thead><tr><th>Detector</th><th>Precision</th><th>Recall</th><th>F1</th><th>False positives</th><th>False negatives</th></tr></thead><tbody>{[{ name: 'Keyword baseline', result: baseline }, { name: 'NVIDIA Nemotron', result: nemotron }].map(({name,result}) => <tr key={name}><th>{name}</th><td>{percent(result.precision)}</td><td>{percent(result.recall)}</td><td className="f1-value">{percent(result.f1)}</td><td>{result.fp}</td><td>{result.fn}</td></tr>)}</tbody></table></div><p className="eval-footnote">Baseline on all 32 cases: precision {percent(fullBaseline.precision)}, recall {percent(fullBaseline.recall)}, F1 {percent(fullBaseline.f1)}, {fullBaseline.fp} false positives. The table above uses only the {paired.length} cases with valid Nemotron responses; coverage matters.</p></section>
      <div className="eval-details-grid"><section className="panel eval-method"><h2>How this is measured</h2><p>32 hand-authored English examples, evenly split between intended scams and legitimate calls. Both detectors identify tactics, then use the existing deterministic weights. A score ≥25 predicts scam. An authority claim alone (15 points) stays below the cutoff.</p><p>Precision = TP / (TP + FP). Recall = TP / (TP + FN). F1 = 2TP / (2TP + FP + FN). Zero denominators display N/A. Errors are abstentions, excluded from both sides of the paired comparison and listed separately.</p><p>Up to {run?.retryPolicy?.maxAttempts ?? 1} API attempts per case in this run. Retries apply only to temporary service/network failures, never to improve a classification. No label, rationale, or baseline result is sent to Nemotron. The prompt, settings, dataset fingerprint, and individual outputs are saved with the run.</p></section><section className="panel eval-method"><h2>What this does—and doesn’t—show</h2><p>This is a small development set, not a held-out benchmark or an estimate of real-world fraud accuracy. Labels describe fictional intent; ambiguous snippets may not prove legitimacy or fraud.</p><p>The keyword baseline has no negation or paraphrase handling. The classifier prompt already describes several tested distinctions. This intentionally basic baseline and the small hand-authored test set limit generalization. Exact quotes establish grounding, not correctness.</p>{run && <div className="run-metadata"><strong>Recorded run</strong><span>{run.model}</span><span>Started: {new Date(run.startedAt).toLocaleString()}</span><span>{run.finishedAt ? `Finished: ${new Date(run.finishedAt).toLocaleString()}` : 'Partial snapshot · refresh for progress'}</span><span>Dataset: {run.datasetVersion} · {run.fingerprint.slice(0,12)}</span></div>}</section></div>
      <section className="panel eval-cases"><div className="panel-heading"><h2>Inspect every prediction</h2><span className="muted">{filtered.length} examples</span></div><div className="eval-filters">{(['all','mistakes','scam','legitimate','errors'] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'all' ? 'All cases' : value === 'mistakes' ? 'Either detector wrong' : value === 'errors' ? 'API errors' : value === 'scam' ? 'Scams' : 'Legitimate'}</button>)}</div>
        {filtered.map(example => {
          const row = run?.rows.find(row => row.id === example.id);
          const base = row?.baseline ?? keywordBaseline(example.lines);
          const ai = row?.nemotron;
          return <article className="eval-case" key={example.id}><div className="eval-case-title"><span>{example.id} · {example.category}</span><strong className={example.label === 'scam' ? 'label-scam' : 'label-legit'}>Expected: {example.label}</strong></div><blockquote>{example.lines.map((line,i) => <p key={i}>“{line}”</p>)}</blockquote><p className="eval-rationale">{example.rationale}</p><div className="prediction-grid"><div><h3>Keyword baseline {base.predictedScam === actual(example.id) ? <Check size={13}/> : <TriangleAlert size={13}/>}</h3><strong>{base.predictedScam ? 'Scam' : 'Legitimate'} · {base.score}/100</strong><p>{base.techniques.map(d => tactics[d.type].label).join(' · ') || 'No tactics detected'}</p></div><div><h3>Nemotron {ai?.status === 'ok' && (ai.predictedScam === actual(example.id) ? <Check size={13}/> : <TriangleAlert size={13}/>)}</h3>{ai?.status === 'ok' ? <><strong>{ai.predictedScam ? 'Scam' : 'Legitimate'} · {ai.score}/100</strong><p>{ai.techniques.map(d => tactics[d.type].label).join(' · ') || 'No tactics detected'} · {(ai.latencyMs/1000).toFixed(1)}s · {ai.attempts ?? 1} attempt(s)</p><details><summary>Inspect validated evidence</summary>{ai.techniques.map(d => <p key={d.type}><b>{tactics[d.type].label}</b>: “{d.evidence}” <span>({Math.round(d.confidence*100)}% model-reported confidence)</span></p>)}{!ai.techniques.length && <p>Empty techniques array.</p>}</details></> : <p className={ai?.status === 'error' ? 'label-scam' : ''}>{ai?.status === 'error' ? ai.error : 'Not yet measured'}</p>}</div></div></article>;
        })}
        {!filtered.length && <p className="eval-footnote">No cases match this filter.</p>}
      </section>
      <footer><span><ShieldCheck size={14}/> Synthetic data. Actual API outputs. Visible limitations.</span><Link href="/">Return to the demo <ArrowUpRight size={12}/></Link></footer>
    </main>
  </div>;
}
