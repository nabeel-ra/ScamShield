import { loadEnvConfig } from '@next/env';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { evaluationCases, datasetVersion } from '../src/lib/evaluation/dataset';
import { baselineVersion, keywordBaseline, metrics, positiveThreshold } from '../src/lib/evaluation/metrics';
import type { EvaluationRun } from '../src/lib/evaluation/types';
import { classificationPrompt } from '../src/lib/analysis';
import { AnalysisError, classifyTranscript, defaultModel, inferenceSettings } from '../src/lib/nemotron';
import { retryPolicy } from '../src/lib/nvidia-transport';
import { scoreRisk } from '../src/lib/scenario';

async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.NVIDIA_API_KEY?.trim()) throw new Error('Add NVIDIA_API_KEY to .env.local first.');
  const model = process.env.NVIDIA_MODEL?.trim() || defaultModel;
  const startedAt = new Date().toISOString();
  const run: EvaluationRun = {
    runId: startedAt.replace(/[:.]/g, '-'), startedAt, finishedAt: null, datasetVersion, model, threshold: positiveThreshold,
    baselineVersion, retryPolicy, prompt: classificationPrompt, settings: inferenceSettings,
    fingerprint: createHash('sha256').update(JSON.stringify({ evaluationCases, classificationPrompt, inferenceSettings, model, positiveThreshold, baselineVersion, retryPolicy })).digest('hex'), rows: [],
  };
  await mkdir('public/evaluation/runs', { recursive: true });
  async function save() {
    const json = JSON.stringify(run, null, 2) + '\n';
    await writeFile(`public/evaluation/runs/${run.runId}.json`, json);
    await writeFile('public/evaluation/latest.json.tmp', json);
    await rename('public/evaluation/latest.json.tmp', 'public/evaluation/latest.json');
  }
  await save();
  for (const example of evaluationCases) {
    const baseline = keywordBaseline(example.lines);
    try {
      // No labels or rationales in this request. Transient service failures get bounded retries; classifications are never retried for a better label.
      const result = await classifyTranscript(example.lines, { model });
      const score = scoreRisk(result.techniques);
      run.rows.push({ id: example.id, baseline, nemotron: { status: 'ok', techniques: result.techniques, score, predictedScam: score >= positiveThreshold, latencyMs: result.latencyMs, attempts: result.attempts, retries: result.retries } });
      console.log(`${run.rows.length}/${evaluationCases.length} ${example.id}: ${score >= positiveThreshold ? 'scam' : 'legitimate'} (${score}/100, ${result.latencyMs}ms)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed';
      run.rows.push({ id: example.id, baseline, nemotron: { status: 'error', error: message, attempts: error instanceof AnalysisError ? error.attempts : 0, retries: error instanceof AnalysisError ? error.retries : [] } });
      console.log(`${run.rows.length}/${evaluationCases.length} ${example.id}: ERROR — ${message}`);
    }
    await save();
  }
  run.finishedAt = new Date().toISOString();
  await save();
  const paired = run.rows.filter(row => row.nemotron.status === 'ok');
  const actual = (id: string) => evaluationCases.find(example => example.id === id)!.label === 'scam';
  console.log(JSON.stringify({ coverage: `${paired.length}/${evaluationCases.length}`, baseline: metrics(paired.map(row => ({ actual: actual(row.id), predicted: row.baseline.predictedScam }))), nemotron: metrics(paired.flatMap(row => row.nemotron.status === 'ok' ? [{ actual: actual(row.id), predicted: row.nemotron.predictedScam }] : [])) }, null, 2));
  console.log('Saved measured results. Open /evaluation.');
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Evaluation failed'); process.exitCode = 1; });
