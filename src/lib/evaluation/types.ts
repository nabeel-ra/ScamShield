import type { RetryEvent } from '../nvidia-transport';
import type { AnalyzedDetection } from '../analysis';
import type { keywordBaseline } from './metrics';
export type EvaluationRow = {
  id: string;
  baseline: ReturnType<typeof keywordBaseline>;
  nemotron: ({ attempts?: number; retries?: RetryEvent[] } & ({ status: 'ok'; techniques: AnalyzedDetection[]; score: number; predictedScam: boolean; latencyMs: number } | { status: 'error'; error: string }));
};
export type EvaluationRun = {
  runId: string; startedAt: string; finishedAt: string | null; datasetVersion: string; fingerprint: string; model: string;
  retryPolicy?: { maxAttempts: number; budgetMs: number; baseDelayMs: number }; threshold: number; baselineVersion: string; prompt: string; settings: unknown; rows: EvaluationRow[];
};
