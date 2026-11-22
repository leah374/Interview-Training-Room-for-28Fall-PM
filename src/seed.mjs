import {readFileSync} from 'node:fs';
import {upsertSource} from './kb.mjs';

const officialCards=JSON.parse(readFileSync(new URL('../data/official_cards.json',import.meta.url),'utf8'));

export function seedBuiltInKnowledge(db,{resumeCards=[],resumeDataMode='demo'}={}){
  for(const card of officialCards)upsertSource(db,{
    id:`official:${card.id}`,kind:'professional',title:card.title,url:card.url,
    publisher:card.publisher,source_type:'curated_official_note',content:`# ${card.title}\n\n${card.content}`,
    review_status:'curated',metadata:{platform:card.platform,topics:card.topics,checked_at:'2026-11-21'}
  });
  for(const card of resumeCards)upsertSource(db,{
    id:`resume:${card.id}`,kind:'personal',title:card.title,
    content:`# ${card.title}\n\n机构：${card.organization}\n时间：${card.period}\n方向：${card.track}\n\n经历记录：\n${card.facts.map(x=>'- '+x).join('\n')}\n\n需核对：${card.claimToVerify}`,
    publisher:resumeDataMode==='private'?'本人简历底稿':'公开匿名演示',source_type:'resume_card',
    review_status:resumeDataMode==='private'?'self_reported':'demo',metadata:{card_id:card.id,verified:false,demo:resumeDataMode==='demo'}
  });
}
