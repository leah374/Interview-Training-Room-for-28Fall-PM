import test from 'node:test';
import assert from 'node:assert/strict';
import {openDb,search} from '../src/kb.mjs';
import {initCoach,abilities,startAttempt,assist,recordAnswer,finishAttempt,buildPlan,saveSettings,abandon,dashboard} from '../src/coach.mjs';
import {resumeCards,questions} from '../src/curriculum.mjs';
const make=()=>{const db=openDb(':memory:');initCoach(db);return db;};
test('cold start has no fabricated mastery and resumes an unfinished attempt',()=>{
  const db=make();assert(abilities(db).every(a=>a.score===null));const a=startAttempt(db,{questionId:'q-cpa'});assert.equal(a.question.id,'q-cpa');assert.equal(startAttempt(db).id,a.id);db.close();
});
test('answer, followup and evaluation persist once and are retrievable',async()=>{
  const db=make();const a=startAttempt(db,{questionId:'q-cpa'});recordAnswer(db,a.id,'首先检查归因口径和回传延迟，再看CTR和CVR，最后拆分流量人群并通过实验验证。');
  const done=await finishAttempt(db,a.id,'我会检查事件时间、订单数据与落地页错误日志。');assert.equal(done.status,'evaluated');assert.equal(done.evaluation.engine,'rules');assert.equal(abilities(db).find(c=>c.id==='diagnosis').attempts,1);
  await finishAttempt(db,a.id,'重复请求');assert.equal(abilities(db).find(c=>c.id==='diagnosis').attempts,1);assert.equal(search(db,'CPA',{kind:'practice'}).length,1);db.close();
});
test('example practice does not improve mastery or complete a planned task',async()=>{
  const db=make();const plan=buildPlan(db);const a=startAttempt(db,{planItemId:plan[0].id,mode:'J'});assist(db,a.id,'example');recordAnswer(db,a.id,'我参考示例学习了广告优化目标和展示计费之间的区别，并说明平台机制不同。');const done=await finishAttempt(db,a.id);assert.equal(done.evaluation.changes.length,0);assert(abilities(db).every(c=>c.score===null));assert.equal(buildPlan(db)[0].status,'pending');db.close();
});
test('hint reduces evidence weight',async()=>{
  const db=make();const a=startAttempt(db,{questionId:'q-rag'});assist(db,a.id,'hint');recordAnswer(db,a.id,'首先检索知识库分块，再生成回答并附来源引用，同时检查召回和资料过期问题。');const r=await finishAttempt(db,a.id);assert.equal(r.evaluation.reliability,0.1);db.close();
});
test('daily plans stay stable and do not grow after completion and replan',async()=>{
  const db=make();saveSettings(db,{minutes:6});const p=buildPlan(db);assert.equal(p.length,1);assert.deepEqual(buildPlan(db).map(x=>x.id),p.map(x=>x.id));const a=startAttempt(db,{mode:'J'});recordAnswer(db,a.id,'首先说明转化目标和展示计费，再区分出价排序与实际成本，结合不同平台判断。');await finishAttempt(db,a.id);const updated=buildPlan(db,{force:true});assert.equal(updated.length,1);assert.equal(updated[0].status,'done');assert.throws(()=>startAttempt(db,{mode:'J'}),/已完成/);db.close();
});
test('abandoned questions do not create assessment evidence',()=>{const db=make();const a=startAttempt(db);abandon(db,a.id);assert.equal(dashboard(db).metrics.attempts,0);assert.equal(dashboard(db).active,null);db.close();});
test('resume practice selects a real project and keeps claims marked for verification',{skip:!resumeCards.length},async()=>{
  const db=make(),card=resumeCards[0];
  assert(resumeCards.length>=3);assert.equal(questions.filter(q=>q.resumeCardId).length,resumeCards.reduce((n,c)=>n+c.questions.length,0));
  const a=startAttempt(db,{projectId:card.id,type:'简历面'});
  assert.equal(a.question.resumeCardId,card.id);assert.equal(a.question.type,'简历面');
  recordAnswer(db,a.id,'我参与了短剧广告链路的设计，先梳理试看和跳转，再通过埋点与实验验证预期消耗的变化。');
  const done=await finishAttempt(db,a.id);
  assert.equal(done.evaluation.resumeEvidence.id,card.id);
  assert(done.evaluation.resumeEvidence.claimToVerify.length>10);
  assert.equal(dashboard(db).resumeProjects.length,resumeCards.length);db.close();
});
test('lifetime totals include attempts beyond the recent history window',async()=>{
  const db=make();const a=startAttempt(db,{questionId:'q-cpa'});recordAnswer(db,a.id,'首先明确归因口径，再看CTR和CVR，最后用实验验证。');await finishAttempt(db,a.id);
  const insert=db.prepare("INSERT INTO coach_attempts(id,question_id,mode,status,evaluation,created_at,finished_at) SELECT ?,question_id,mode,status,evaluation,created_at,finished_at FROM coach_attempts WHERE id=?");
  for(let i=0;i<104;i++)insert.run('historical-'+i,a.id);
  const d=dashboard(db);assert.equal(d.metrics.attempts,105);assert.equal(d.metrics.today,105);assert.equal(d.history.length,6);db.close();
});
test('model output requires exact answer evidence and falls back on fabricated quotes',async t=>{
  const oldEndpoint=process.env.COACH_MODEL_ENDPOINT,oldModel=process.env.COACH_MODEL;
  process.env.COACH_MODEL_ENDPOINT='https://model.test/chat/completions';process.env.COACH_MODEL='test-model';
  const answer='首先核对归因口径，再分析CTR和CVR变化，最后用对照实验验证。';
  let fabricated=false;
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({dimensions:Array.from({length:4},()=>({level:3,evidence:fabricated?'不存在的用户原文':'核对归因口径'})),summary:'先核对口径再做诊断。',strengths:['有验证步骤'],gaps:['缺少量化假设'],nextAction:'补充实验设计'})}}]})}));
  const db=make();try{
    const first=startAttempt(db,{questionId:'q-cpa'});recordAnswer(db,first.id,answer);const accepted=await finishAttempt(db,first.id);assert.equal(accepted.evaluation.engine,'model');assert.equal(accepted.evaluation.reliability,0.7);
    fabricated=true;const second=startAttempt(db,{questionId:'q-rag'});recordAnswer(db,second.id,answer);const fallback=await finishAttempt(db,second.id);assert.equal(fallback.evaluation.engine,'rules');assert.match(fallback.evaluation.warning,/证据与格式校验/);
  }finally{db.close();if(oldEndpoint===undefined)delete process.env.COACH_MODEL_ENDPOINT;else process.env.COACH_MODEL_ENDPOINT=oldEndpoint;if(oldModel===undefined)delete process.env.COACH_MODEL;else process.env.COACH_MODEL=oldModel;}
});
