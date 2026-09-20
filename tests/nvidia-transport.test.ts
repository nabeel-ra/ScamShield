import assert from 'node:assert/strict';
import { test } from 'node:test';
import { abortableSleep, requestWithRetry, retryAfterMs, TransportError } from '../src/lib/nvidia-transport';
const url = 'https://example.invalid';

test('503 retries recover with exponential delays and an honest attempt count', async () => {
  let calls = 0; const delays: number[] = [];
  const result = await requestWithRetry(url, {}, { fetch: async () => new Response('', {status: ++calls < 3 ? 503 : 200}), sleep: async ms => {delays.push(ms);}, random: () => 0 });
  assert.equal(result.response.status,200); assert.equal(result.attempts,3); assert.deepEqual(delays,[1000,2000]);
  assert.deepEqual(result.retries.map(r=>r.reason),[503,503]);
});
test('persistent 503 failures stop after three attempts', async () => {
  let calls = 0;
  const result = await requestWithRetry(url, {}, {fetch: async () => {calls++;return new Response('',{status:503});},sleep:async()=>{},random:()=>0});
  assert.equal(calls,3);assert.equal(result.response.status,503);
});
test('permanent errors and successful output are not retried', async () => {
  for (const status of [200,400,401,403,404,410,422]) {
    let calls = 0;
    const result=await requestWithRetry(url,{}, {fetch:async()=>{calls++;return new Response('invalid output',{status});},sleep:async()=>{assert.fail('unexpected retry');}});
    assert.equal(calls,1);assert.equal(result.response.status,status);
  }
});
test('Retry-After is honored and never shortened to fit the time budget', async () => {
  const delays:number[]=[];let calls=0;
  await requestWithRetry(url,{}, {fetch:async()=>new Response('',{status:++calls===1?429:200,headers:{'retry-after':'5'}}),sleep:async ms=>{delays.push(ms);},random:()=>0});
  assert.deepEqual(delays,[5000]);
  const result=await requestWithRetry(url,{}, {fetch:async()=>new Response('',{status:503,headers:{'retry-after':'60'}}),sleep:async()=>assert.fail('must not retry early')});
  assert.equal(result.attempts,1);assert.equal(result.response.status,503);
  assert.equal(retryAfterMs('Thu, 01 Jan 1970 00:00:10 GMT',0),10000);
  assert.equal(retryAfterMs('invalid',0),null);
});
test('network failures retry and may recover', async()=>{
  let calls=0;
  const result=await requestWithRetry(url,{}, {fetch:async()=>{if(++calls===1)throw new TypeError('network');return new Response('');},sleep:async()=>{}});
  assert.equal(result.attempts,2);assert.equal(result.retries[0].reason,'network');
});
test('cancellation during backoff stops further requests',async()=>{
  let calls=0;const controller=new AbortController();
  await assert.rejects(requestWithRetry(url,{signal:controller.signal},{fetch:async()=>{calls++;return new Response('',{status:503});},sleep:async(_ms,signal)=>{controller.abort();signal.throwIfAborted();}}),TransportError);
  assert.equal(calls,1);
});
test('already cancelled requests never contact the provider; sleep aborts promptly',async()=>{
  const controller=new AbortController();controller.abort();
  await assert.rejects(requestWithRetry(url,{signal:controller.signal},{fetch:async()=>{assert.fail('unexpected fetch');}}),TransportError);
  await assert.rejects(abortableSleep(10000,controller.signal));
});
