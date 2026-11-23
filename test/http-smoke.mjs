import assert from 'node:assert/strict';
import {openDb} from '../src/kb.mjs';
import {createServer} from '../src/server.mjs';
const db=openDb(':memory:');const server=createServer(db);
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const call=async(path,data)=>{const r=await fetch(base+path,{method:data?'POST':'GET',headers:data?{'content-type':'application/json'}:{},body:data?JSON.stringify(data):undefined});assert(r.ok,await r.clone().text());return r.json();};
try{
  const html=await fetch(base);assert.equal(html.status,200);assert((await html.text()).includes('候场'));
  assert.equal((await call('/api/dashboard')).metrics.attempts,0);
  const a=await call('/api/attempts',{questionId:'q-cpa'});
  assert.equal((await call(`/api/attempts/${a.id}/answer`,{answer:'首先检查回传口径和延迟，再看CTR和CVR以及流量人群变化，最后通过对照实验验证。'})).status,'followup');
  assert.equal((await call(`/api/attempts/${a.id}/finish`,{answer:'核对订单时间和落地页埋点。'})).status,'evaluated');
  assert.equal((await call('/api/dashboard')).metrics.attempts,1);
  const source=await call('/api/library',{kind:'personal',title:'测试项目',content:'这是用于接口验证的项目背景、本人职责和结果。'});
  assert((await call('/api/source?id='+encodeURIComponent(source.id))).raw_content.includes('本人职责'));
  const blocked=await fetch(base+'/api/settings',{method:'POST',headers:{'content-type':'application/json',origin:'https://untrusted.example'},body:'{}'});assert.equal(blocked.status,403);
  const next=await call('/api/attempts',{questionId:'q-rag'});
  const answer='首先明确检索的资料范围，再评估召回质量，最后检查引用证据与生成内容。';
  await call(`/api/attempts/${next.id}/answer`,{answer});
  const nativeFetch=globalThis.fetch,oldEndpoint=process.env.COACH_MODEL_ENDPOINT,oldModel=process.env.COACH_MODEL;
  let signalStarted,release;
  const started=new Promise(r=>{signalStarted=r;}),pending=new Promise(r=>{release=r;});
  process.env.COACH_MODEL_ENDPOINT='https://isolated-model.test/chat/completions';process.env.COACH_MODEL='test-model';
  globalThis.fetch=(url,options)=>String(url)===process.env.COACH_MODEL_ENDPOINT?(signalStarted(),pending):nativeFetch(url,options);
  try{
    const first=call(`/api/attempts/${next.id}/finish`,{answer:''});
    await started;
    const second=await fetch(base+`/api/attempts/${next.id}/finish`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
    assert.equal(second.status,409);
    release({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({dimensions:Array.from({length:4},()=>({level:3,evidence:'检查引用证据'})),summary:'有检索验证意识',strengths:['有证据'],gaps:['缺少指标'],nextAction:'补充指标'})}}]})});
    assert.equal((await first).status,'evaluated');
    assert.equal((await call('/api/dashboard')).competencies.find(c=>c.id==='rag').attempts,1);
  }finally{
    release({ok:false,status:503});globalThis.fetch=nativeFetch;
    if(oldEndpoint===undefined)delete process.env.COACH_MODEL_ENDPOINT;else process.env.COACH_MODEL_ENDPOINT=oldEndpoint;
    if(oldModel===undefined)delete process.env.COACH_MODEL;else process.env.COACH_MODEL=oldModel;
  }
  console.log('HTTP smoke passed: UI, dashboard, practice lifecycle, source import, cross-origin and concurrent evaluation protection');
}finally{await new Promise(r=>server.close(r));db.close();}
