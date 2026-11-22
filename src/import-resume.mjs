import {openDb,upsertSource,stats} from './kb.mjs';
import {resumeCards,resumeDataMode} from './curriculum.mjs';
const db=openDb();
for(const card of resumeCards){
  const content=`# ${card.title}\n\n机构：${card.organization}\n时间：${card.period}\n方向：${card.track}\n\n简历底稿记载：\n${card.facts.map(x=>'- '+x).join('\n')}\n\n需核对：${card.claimToVerify}`;
  const result=upsertSource(db,{id:`resume:${card.id}`,kind:'personal',title:card.title,content,publisher:resumeDataMode==='private'?'本人简历底稿':'公开匿名演示',source_type:'resume_card',review_status:resumeDataMode==='private'?'self_reported':'demo',metadata:{card_id:card.id,verified:false,demo:resumeDataMode==='demo'}});
  console.log(JSON.stringify({title:card.title,...result}));
}
console.log(JSON.stringify(stats(db)));db.close();
