import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDetections } from '../src/lib/analysis';
import { scenario, scoreRisk } from '../src/lib/scenario';
import { POST } from '../src/app/api/analyze/route';

const lines = scenario.map(line => line.text);
const valid = { type: 'otp_request', confidence: 0.97, evidence: lines[4], severity: 'critical' };
const json = (techniques: unknown[]) => JSON.stringify({ techniques });

test('accepts exact grounded evidence, preserves confidence, and derives its line', () => {
  assert.deepEqual(parseDetections(json([valid]), lines), [{ ...valid, lineIndex: 4 }]);
  assert.deepEqual(parseDetections(json([]), lines), []);
});
test('rejects invented evidence, future evidence, unknown types, duplicates, and invalid confidence', () => {
  for (const candidate of [ { ...valid, evidence: 'Send me your password' }, { ...valid, type: '__proto__' }, { ...valid, confidence: 1.1 }, { ...valid, confidence: '0.97' }, { ...valid, severity: 'extreme' }, { ...valid, evidence: '' } ]) assert.throws(() => parseDetections(json([candidate]), lines));
  assert.throws(() => parseDetections(json([valid]), lines.slice(0, 4)));
  assert.throws(() => parseDetections(json([valid, valid]), lines));
});
test('rejects prose, markdown, and model-invented risk scores', () => {
  for (const value of ['not json', '```json\n' + json([valid]) + '\n```', JSON.stringify({ techniques: [], score: 100 }), 'null']) assert.throws(() => parseDetections(value, lines));
});
test('risk score counts each tactic once and caps at 100', () => {
  const detections = scenario.flatMap(line => line.detections);
  assert.equal(scoreRisk(detections), 90);
  assert.equal(scoreRisk([...detections, ...detections]), 90);
  assert.equal(scoreRisk([...detections, { type: 'payment_request', evidence: '', severity: 'critical' }]), 100);
});
test('route validates input and fails safely without exposing keys or provider errors', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.NVIDIA_API_KEY;
  const request = (input: unknown) => new Request('http://localhost/api/analyze', { method: 'POST', body: JSON.stringify(input) });
  try {
    delete process.env.NVIDIA_API_KEY;
    assert.equal((await POST(request({ lineCount: 1 }))).status, 503);
    for (const input of [{ lineCount: 0 }, { lineCount: 7 }, { lineCount: 1.5 }, { lineCount: 1, transcript: 'custom data' }, null]) assert.equal((await POST(request(input))).status, 400);
    process.env.NVIDIA_API_KEY = 'test-key-not-real';
    globalThis.fetch = async (_url, options) => {
      const sent = JSON.parse(String(options?.body));
      assert.deepEqual(JSON.parse(sent.messages[1].content).transcript, lines.slice(0, 5));
      assert.equal(JSON.stringify(sent).includes('detections'), false);
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: json([valid]) } }] });
    };
    const success = await POST(request({ lineCount: 5 }));
    assert.equal(success.status, 200);
    assert.equal((await success.json()).techniques[0].lineIndex, 4);
    globalThis.fetch = async () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: json([{ ...valid, evidence: 'invented' }]) } }] });
    assert.equal((await POST(request({ lineCount: 5 }))).status, 502);
    globalThis.fetch = async () => new Response('secret provider debug detail', { status: 401 });
    const error = await POST(request({ lineCount: 5 }));
    const message = await error.text();
    assert.equal(error.status, 502);
    assert.ok(!message.includes('test-key-not-real') && !message.includes('secret provider'));
    globalThis.fetch = async () => new Response('', { status: 429 });
    assert.equal((await POST(request({ lineCount: 5 }))).status, 429);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.NVIDIA_API_KEY;
    else process.env.NVIDIA_API_KEY = originalKey;
  }
});
