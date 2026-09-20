export const retryPolicy = { maxAttempts: 3, budgetMs: 45000, baseDelayMs: 1000 } as const;
export type RetryEvent = { attempt: number; reason: number | 'network'; delayMs: number };
export class TransportError extends Error {
  constructor(message: string, public attempts: number, public retries: RetryEvent[]) { super(message); }
}
const transientStatuses = new Set([429, 500, 502, 503, 504]);
export function retryAfterMs(value: string | null, now: number): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : null;
}
export function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}
// Dependencies are injectable so retry tests never contact NVIDIA or wait in real time.
export async function requestWithRetry(url: string, init: RequestInit, dependencies: {
  fetch?: typeof fetch; sleep?: typeof abortableSleep; now?: () => number; random?: () => number;
} = {}) {
  const send = dependencies.fetch ?? fetch;
  const sleep = dependencies.sleep ?? abortableSleep;
  const now = dependencies.now ?? Date.now;
  const random = dependencies.random ?? Math.random;
  const started = now();
  const signal = AbortSignal.any([AbortSignal.timeout(retryPolicy.budgetMs), ...(init.signal ? [init.signal] : [])]);
  const retries: RetryEvent[] = [];
  let attempts = 0;
  try {
    while (attempts < retryPolicy.maxAttempts) {
      signal.throwIfAborted();
      attempts++;
      let response: Response | undefined;
      try { response = await send(url, { ...init, signal }); }
      catch { signal.throwIfAborted(); }
      const reason = response?.status ?? 'network';
      if (response && !transientStatuses.has(response.status)) return { response, attempts, retries };
      if (attempts === retryPolicy.maxAttempts) {
        if (response) return { response, attempts, retries };
        throw new Error('Network unavailable');
      }
      const backoff = retryPolicy.baseDelayMs * 2 ** (attempts - 1) + Math.floor(random() * 250);
      const delayMs = Math.max(backoff, retryAfterMs(response?.headers.get('retry-after') ?? null, now()) ?? 0);
      // Never shorten Retry-After to fit our budget. Return the failure instead.
      if (delayMs >= retryPolicy.budgetMs - (now() - started)) {
        if (response) return { response, attempts, retries };
        throw new Error('Retry budget exhausted');
      }
      await response?.body?.cancel();
      retries.push({ attempt: attempts, reason, delayMs });
      await sleep(delayMs, signal);
    }
    throw new Error('Retry limit reached');
  } catch {
    throw new TransportError(signal.aborted ? 'Analysis timed out or was cancelled.' : 'Could not reach NVIDIA after bounded retries.', attempts, retries);
  }
}
