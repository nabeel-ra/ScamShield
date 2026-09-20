'use client';
import { useEffect, useRef, useState } from 'react';
import type { Scenario } from '@/lib/scenarios';
import { AudioManifest, validAudioManifest } from '@/lib/audio';

export function useCall(selected: Scenario) {
  const scenario = selected.lines;
  const CALL_DURATION = selected.duration;
  const [status, setStatus] = useState<'idle' | 'active' | 'ended'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [lineCount, setLineCount] = useState(0);
  const [lineTimes, setLineTimes] = useState<number[]>([]);
  const [voice, setVoice] = useState(false);
  const [muted, setMuted] = useState(false);
  const [manifest, setManifest] = useState<AudioManifest | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [checking, setChecking] = useState(true);
  const audio = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const epoch = useRef(0);
  const startTime = useRef(0);

  async function refreshAudio(signal?: AbortSignal) {
    setChecking(true);
    try {
      const response = await fetch(selected.manifest, { cache: 'no-store', signal });
      const value: unknown = response.ok ? await response.json() : null;
      if (!signal?.aborted) setManifest(validAudioManifest(value, scenario.map(line => line.text)) ? value : null);
    } catch { if (!signal?.aborted) setManifest(null); }
    finally { if (!signal?.aborted) setChecking(false); }
  }
  function stopMedia() {
    epoch.current += 1;
    if (timer.current) clearInterval(timer.current);
    if (watchdog.current) clearTimeout(watchdog.current);
    if (audio.current) { audio.current.onplaying = null; audio.current.onended = null; audio.current.onerror = null; audio.current.pause(); audio.current.removeAttribute('src'); audio.current.load(); }
    audio.current = null;
  }
  useEffect(() => {
    const controller = new AbortController();
    void refreshAudio(controller.signal);
    return () => { controller.abort(); stopMedia(); };
  }, []);

  function reset() {
    stopMedia(); setStatus('idle'); setElapsed(0); setLineCount(0); setLineTimes([]); setAudioError(null); setCompleted(false);
  }
  function end() { stopMedia(); setStatus('ended'); }
  function start() {
    stopMedia(); setElapsed(0); setLineCount(0); setLineTimes([]); setCompleted(false); setAudioError(null);
    const run = epoch.current;
    startTime.current = Date.now();
    setStatus('active');
    timer.current = setInterval(() => {
      const seconds = Math.floor((Date.now() - startTime.current) / 1000);
      setElapsed(voice ? seconds : Math.min(seconds, CALL_DURATION));
      if (!voice) {
        setLineCount(scenario.filter(line => line.at <= seconds).length);
        if (seconds >= CALL_DURATION) { stopMedia(); setCompleted(true); setStatus('ended'); }
      }
    }, 200);
    if (!voice) return;
    if (!manifest) { stopMedia(); setStatus('ended'); setAudioError('Voice clips are not ready. Select Silent to run the demo.'); return; }
    // Reuse one media element. The first play() runs directly within the Start click.
    const player = new Audio(); audio.current = player; player.muted = muted;
    let index = 0;
    function fail() {
      if (epoch.current !== run) return;
      stopMedia(); setStatus('ended'); setAudioError('Audio could not play. Check sound/browser permissions or select Silent and replay.');
    }
    function playClip() {
      if (epoch.current !== run || !manifest) return;
      if (watchdog.current) clearTimeout(watchdog.current);
      // A bounded timeout handles missing clips, stalled downloads, or stalled playback.
      watchdog.current = setTimeout(fail, 30000);
      player.src = manifest.clips[index].url;
      player.onplaying = () => {
        if (epoch.current !== run) return;
        const seconds = Math.floor((Date.now() - startTime.current) / 1000);
        setLineCount(index + 1);
        setLineTimes(previous => { const next = [...previous]; next[index] ??= seconds; return next; });
      };
      player.onended = () => {
        if (epoch.current !== run) return;
        index += 1;
        if (index < scenario.length) playClip();
        else { stopMedia(); setCompleted(true); setStatus('ended'); }
      };
      player.onerror = fail;
      void player.play().catch(fail);
    }
    playClip();
  }
  function changeVoice(value: boolean) { reset(); setVoice(value); }
  function toggleMute() { const next = !muted; setMuted(next); if (audio.current) audio.current.muted = next; }
  return { status, elapsed, lineCount, lineTimes, voice, muted, audioReady: !!manifest, audioError, checking, completed, start, end, reset, changeVoice, toggleMute, refreshAudio: () => refreshAudio() };
}
