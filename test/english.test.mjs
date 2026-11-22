import test from 'node:test';
import assert from 'node:assert/strict';
import {openDb,search} from '../src/kb.mjs';
import {initCoach,startAttempt,recordAnswer,finishAttempt,abilities,translateAttempt} from '../src/coach.mjs';
import {translateEnglish,evaluateEnglish,matchTerms} from '../src/english.mjs';
const answer='First, I would define the business goal and check the attribution window. Then I would compare conversion rates across audiences and placements. I would validate my hypothesis with a controlled experiment before changing the bidding strategy.';
test('English questions and glossary work without a model, but do not fabricate language scores',async()=>{
 const db=openDb(':memory:');initCoach(db);const a=startAttempt(db,{competency:'english'});assert.equal(a.question.language,'en');
 const question=await translateAttempt(db,a.id,{kind:'question'});assert.equal(question.translation,a.question.prompt);
 const translated=await translateAttempt(db,a.id,{text:'目标转化成本为20，广告支出回报率是200%。'});assert.equal(translated.status,'unavailable');assert.equal(translated.translation,null);assert(translated.terms.length>=2);assert(search(db,'retrieval-augmented',{kind:'professional'}).length);
 recordAnswer(db,a.id,answer);const result=await finishAttempt(db,a.id);assert.equal(result.evaluation.english.status,'unavailable');assert.equal(abilities(db).find(c=>c.id==='english').score,null);db.close();
});
test('translation uses grounded terminology and rejects changed numeric claims',async()=>{
 const db=openDb(':memory:');initCoach(db);let context;
 const result=await translateEnglish(db,{text:'广告支出回报率提升20%。'},async(system,input)=>{context=input;return {translation:'Return on ad spend increased by 20%.',notes:[]};});
 assert.equal(result.status,'translated');assert.equal(context.terms[0].abbr,'ROAS');assert(context.references.length);
 const invalid=await translateEnglish(db,{text:'广告支出回报率提升20%。'},async()=>({translation:'ROAS increased by 30%.',notes:[]}));assert.equal(invalid.status,'error');assert.equal(invalid.translation,null);db.close();
});
test('English assessment accepts evidence, rejects invented quotes and excludes assisted answers',async()=>{
 let called=false;const fake=async()=>{called=true;return {dimensions:Array.from({length:4},()=>({level:3,evidence:'business goal',feedback:'补充更具体的措辞。'}))};};
 const valid=await evaluateEnglish({answer},'',fake);assert.equal(valid.score,75);
 const invalid=await evaluateEnglish({answer},'',async()=>({dimensions:Array.from({length:4},()=>({level:4,evidence:'not in the answer',feedback:'x'}))}));assert.equal(invalid.status,'error');
 called=false;const assisted=await evaluateEnglish({answer,english_assisted:1},'',fake);assert.equal(assisted.status,'assisted');assert.equal(called,false);
 assert.equal((await evaluateEnglish({answer:'我会先看CTR，然后核对归因与数据回传'},'',fake)).status,'insufficient');
 assert.equal(matchTerms('CPA and RAG').length>=2,true);
});
test('independent model English assessment updates mastery; translated practice never does',async t=>{
 const env={endpoint:process.env.COACH_MODEL_ENDPOINT,model:process.env.COACH_MODEL};process.env.COACH_MODEL_ENDPOINT='https://model.test/chat/completions';process.env.COACH_MODEL='test';
 t.mock.method(globalThis,'fetch',async(_url,request)=>{const system=JSON.parse(request.body).messages[0].content;const value=system.includes('只忠实翻译')?{translation:'I would check the conversion rate.',notes:[]}:system.includes('书面表达')?{dimensions:Array.from({length:4},()=>({level:3,evidence:'business goal',feedback:'进一步精简。'}))}:{dimensions:Array.from({length:4},()=>({level:3,evidence:'business goal'})),summary:'清楚',strengths:[],gaps:[],nextAction:'补充证据'};return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(value)}}]})};});
 const db=openDb(':memory:');initCoach(db);
 try{const first=startAttempt(db,{competency:'english'});recordAnswer(db,first.id,answer);await finishAttempt(db,first.id);assert.equal(abilities(db).find(c=>c.id==='english').attempts,1);
 const second=startAttempt(db,{competency:'english'});await translateAttempt(db,second.id,{text:'我会检查转化率。'});recordAnswer(db,second.id,answer);const result=await finishAttempt(db,second.id);assert.equal(result.evaluation.english.status,'assisted');assert.equal(abilities(db).find(c=>c.id==='english').attempts,1);
 }finally{db.close();if(env.endpoint===undefined)delete process.env.COACH_MODEL_ENDPOINT;else process.env.COACH_MODEL_ENDPOINT=env.endpoint;if(env.model===undefined)delete process.env.COACH_MODEL;else process.env.COACH_MODEL=env.model;}
});
