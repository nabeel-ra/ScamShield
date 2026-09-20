'use client';
import { useEffect, useRef, useState } from 'react';
import type { AnalyzedDetection } from '@/lib/analysis';

export type AnalysisMode = 'mock' | 'nemotron';
export type DetectionEvent = AnalyzedDetection & { detectedAt: number };

// One request at a time. If speech moves ahead, analyze the newest available prefix next.
// An epoch and AbortController prevent replay/mode changes from accepting stale results.
export function useNemotron(lineCount: number, elapsed: number, mode: AnalysisMode, session: number) {
  const [detections, setDetections] = useState<DetectionEvent[]>([]);
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState('');
  const [latencyMs, setLatencyMs] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [retry, setRetry] = useState(0);
  const control = useRef<{ epoch: number; controller: AbortController | null; busy: boolean; processed: number }>({ epoch: 0, controller: null, busy: false, processed: 0 });
  const currentTime = useRef(elapsed);
  useEffect(() => { currentTime.current = elapsed; }, [elapsed]);
  useEffect(() => {
    const state = control.current;
    state.epoch += 1;
    state.controller?.abort();
    state.busy = false;
    state.processed = 0;
    setDetections([]); setAnalyzedCount(0); setBusy(false); setError(null); setModel(''); setLatencyMs(0); setAttempts(0);
    return () => { state.epoch += 1; state.controller?.abort(); };
  }, [mode, session]);

  useEffect(() => {
    const state = control.current;
    if (mode !== 'nemotron' || lineCount === 0 || state.busy || error || state.processed >= lineCount) return;
    const epoch = state.epoch;
    const controller = new AbortController();
    state.controller = controller;
    state.busy = true; setBusy(true);
    async function analyze() {
      try {
        const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lineCount }), signal: controller.signal });
        const result = await response.json();
        if (epoch !== state.epoch) return;
        if (!response.ok) throw new Error(result.error || 'Analysis failed. Retry or select Mock mode.');
        setDetections(previous => {
          const known = new Set(previous.map(d => d.type));
          const added = (result.techniques as AnalyzedDetection[]).filter(d => !known.has(d.type)).map(d => ({ ...d, detectedAt: currentTime.current }));
          return [...previous, ...added];
        });
        state.processed = lineCount;
        setAnalyzedCount(lineCount); setModel(result.model); setLatencyMs(result.latencyMs); setAttempts(result.attempts ?? 1);
      } catch (cause) {
        if (epoch === state.epoch && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Analysis failed.');
      } finally {
        if (epoch === state.epoch) { state.busy = false; setBusy(false); }
      }
    }
    void analyze();
  }, [lineCount, mode, session, busy, error, retry]);
  return { detections, analyzedCount, busy, error, model, latencyMs, attempts, retry: () => { setError(null); setRetry(value => value + 1); } };
}
