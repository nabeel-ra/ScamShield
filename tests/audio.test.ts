import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validAudioManifest } from '../src/lib/audio';

test('accepts only complete local ElevenLabs audio matching the current transcript', () => {
  const lines = ['First line.', 'Second line.'];
  const clips = lines.map((text, index) => ({ text, url: `/audio/caller-${index + 1}-0123456789abcdef.mp3` }));
  assert.equal(validAudioManifest({ provider: 'ElevenLabs', clips }, lines), true);
  for (const manifest of [null, { provider: 'other', clips }, { provider: 'ElevenLabs', clips: clips.slice(0,1) }, { provider: 'ElevenLabs', clips: [...clips].reverse() }, { provider: 'ElevenLabs', clips: clips.map(c => ({ ...c, url: 'https://example.com/audio.mp3' })) }, { provider: 'ElevenLabs', clips: clips.map(c => ({ ...c, url: '/audio/../private.mp3' })) }]) assert.equal(validAudioManifest(manifest, lines), false);
});
