import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { scenarios, getScenario, bankFraudLines } from '../src/lib/scenarios';
import { scoreRisk, safetyAction } from '../src/lib/scenario';
import { validAudioManifest } from '../src/lib/audio';

test('scenario evidence is grounded and each risk progression is distinct', () => {
  assert.equal(scenarios.length, 5);
  assert.equal(new Set(scenarios.map(s => s.id)).size, 5);
  assert.equal(getScenario('unknown'), undefined);
  assert.equal(getScenario('bank-fraud')?.lines, bankFraudLines);
  const progressions = scenarios.map(s => {
    assert.ok(s.duration > s.lines.at(-1)!.at);
    s.lines.forEach((line, i) => {
      assert.ok(i === 0 || line.at > s.lines[i - 1].at);
      line.detections.forEach(d => assert.ok(line.text.includes(d.evidence)));
    });
    const scores = s.lines.map((_, i) => scoreRisk(s.lines.slice(0, i + 1).flatMap(line => line.detections)));
    assert.ok(scores.at(-1)! >= 75);
    assert.ok(scores[0] < scores.at(-1)!);
    const action = safetyAction(s.lines.flatMap(line => line.detections), s.verification);
    assert.ok(action.includes(s.verification));
    return scores.join(',');
  });
  assert.equal(new Set(progressions).size, 5);
});

test('every scenario has matching playable local audio assets', async () => {
  for (const s of scenarios) {
    const manifest = JSON.parse(await readFile(join('public', s.manifest), 'utf8'));
    assert.ok(validAudioManifest(manifest, s.lines.map(line => line.text)), s.id);
    for (const clip of manifest.clips) assert.ok((await stat(join('public', clip.url))).size > 1000);
  }
});
