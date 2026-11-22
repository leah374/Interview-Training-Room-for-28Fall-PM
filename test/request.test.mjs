import test from 'node:test';
import assert from 'node:assert/strict';
import {requestJSON} from '../public/request.js';
test('network failure gives a recovery instruction and never replays a write',async()=>{
  let calls=0;const statuses=[];
  await assert.rejects(requestJSON('/api/attempts',{mode:'P'},{fetchImpl:async()=>{calls++;throw new TypeError('Failed to fetch');},onConnection:value=>statuses.push(value)}),/start.cmd/);
  assert.equal(calls,1);assert.deepEqual(statuses,[false]);
});
test('HTTP validation errors do not imply a disconnected server',async()=>{
  const statuses=[];
  await assert.rejects(requestJSON('/api/attempts',{}, {fetchImpl:async()=>({ok:false,json:async()=>({error:'今日计划已完成'})}),onConnection:value=>statuses.push(value)}),/今日计划已完成/);
  assert.deepEqual(statuses,[true]);
});
test('successful reconnect returns data and clears the disconnected state',async()=>{
  let connected=false;const data=await requestJSON('/health',undefined,{fetchImpl:async()=>({ok:true,json:async()=>({ok:true})}),onConnection:value=>connected=value});
  assert.equal(connected,true);assert.deepEqual(data,{ok:true});
});
