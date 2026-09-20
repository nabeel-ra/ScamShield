import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluationCases } from '../src/lib/evaluation/dataset';
import { keywordBaseline, metrics, positiveThreshold } from '../src/lib/evaluation/metrics';

test('confusion matrix and precision/recall/F1 use the correct denominators', () => {
  const result = metrics([{actual:true,predicted:true},{actual:true,predicted:true},{actual:false,predicted:true},{actual:true,predicted:false},{actual:false,predicted:false}]);
  assert.deepEqual(result, {count:5,tp:2,fp:1,tn:1,fn:1,precision:2/3,recall:2/3,f1:4/6});
});
test('undefined metrics are null rather than fabricated success', () => {
  assert.deepEqual(metrics([]), {count:0,tp:0,fp:0,tn:0,fn:0,precision:null,recall:null,f1:null});
  const missed = metrics([{actual:true,predicted:false}]);
  assert.equal(missed.precision,null); assert.equal(missed.recall,0); assert.equal(missed.f1,0);
  const falseAlarm = metrics([{actual:false,predicted:true}]);
  assert.equal(falseAlarm.precision,0); assert.equal(falseAlarm.recall,null); assert.equal(falseAlarm.f1,0);
});
test('baseline applies frozen weights once and intentionally does not understand negation', () => {
  assert.equal(positiveThreshold,25);
  assert.equal(keywordBaseline(['This is your bank.']).predictedScam,false);
  assert.equal(keywordBaseline(['Tell me your password.']).predictedScam,true);
  assert.equal(keywordBaseline(['Tell me your password.','Tell me your password.']).score,25);
  assert.equal(keywordBaseline(['Never share a verification code.']).predictedScam,true);
});
test('dataset has unique IDs and the intended balanced 32 examples', () => {
  assert.equal(evaluationCases.length,32);
  assert.equal(new Set(evaluationCases.map(c=>c.id)).size,32);
  assert.equal(evaluationCases.filter(c=>c.label==='scam').length,16);
  assert.equal(evaluationCases.filter(c=>c.label==='legitimate').length,16);
  assert.ok(evaluationCases.every(c=>c.lines.length && c.lines.every(Boolean) && c.rationale));
});
