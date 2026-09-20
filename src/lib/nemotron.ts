import { requestWithRetry, TransportError, type RetryEvent } from './nvidia-transport';
import { classificationPrompt, parseDetections } from './analysis';
export const defaultModel = 'nvidia/nemotron-3-super-120b-a12b';
export const inferenceSettings = { stream: false, temperature: 0, max_tokens: 1400, chat_template_kwargs: { enable_thinking: false } } as const;
export class AnalysisError extends Error {
  constructor(message: string, public status: number = 502, public attempts: number = 0, public retries: RetryEvent[] = []) { super(message); }
}
// Server/CLI only: never import this module into a client component.
export async function classifyTranscript(lines: readonly string[], options: { signal?: AbortSignal; model?: string } = {}) {
  const key = process.env.NVIDIA_API_KEY?.trim();
  if (!key) throw new AnalysisError('Add NVIDIA_API_KEY to .env.local, then restart the dev server and retry.', 503);
  const model = options.model || process.env.NVIDIA_MODEL?.trim() || defaultModel;
  const signal = AbortSignal.any([AbortSignal.timeout(45000), ...(options.signal ? [options.signal] : [])]);
  const started = Date.now();
  let attempts = 0;
  let retries: RetryEvent[] = [];
  try {
    const transport = await requestWithRetry('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, cache: 'no-store', signal,
      body: JSON.stringify({ model, ...inferenceSettings, messages: [{ role: 'system', content: classificationPrompt }, { role: 'user', content: JSON.stringify({ transcript: lines }) }] }),
    });
    const { response } = transport;
    attempts = transport.attempts; retries = transport.retries;
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new AnalysisError('NVIDIA rejected the API key or model access. Check your NVIDIA Build key.');
      if (response.status === 429) throw new AnalysisError('NVIDIA rate limit reached. Wait a moment and retry, or select Mock mode.', 429);
      throw new AnalysisError(`NVIDIA could not complete analysis (HTTP ${response.status}). Retry or select Mock mode.`);
    }
    const payload = await response.json();
    const choice = payload?.choices?.[0];
    if (choice?.finish_reason !== 'stop' || typeof choice?.message?.content !== 'string') throw new AnalysisError('NVIDIA returned incomplete analysis. Retry or select Mock mode.');
    try { return { techniques: parseDetections(choice.message.content, lines), model, latencyMs: Date.now() - started, attempts, retries }; }
    catch { throw new AnalysisError('NVIDIA output failed JSON or evidence validation. No unverified detections were added. Retry analysis.'); }
  } catch (error) {
    if (error instanceof TransportError) throw new AnalysisError(error.message, 502, error.attempts, error.retries);
    if (error instanceof AnalysisError) { error.attempts = attempts; error.retries = retries; throw error; }
    throw new AnalysisError(signal.aborted ? 'Analysis timed out or was cancelled. Retry or select Mock mode.' : 'Could not reach NVIDIA. Check your connection and retry.', 502, attempts, retries);
  }
}
