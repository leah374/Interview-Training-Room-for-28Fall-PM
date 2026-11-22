import { readFileSync } from 'node:fs';
import { openDb, upsertSource, stats } from './kb.mjs';

const cards = JSON.parse(readFileSync(new URL('../data/official_cards.json',import.meta.url),'utf8'));
const db = openDb();
for (const card of cards) {
  const result = upsertSource(db,{
    id:`official:${card.id}`,kind:'professional',title:card.title,url:card.url,
    publisher:card.publisher,source_type:'curated_official_note',content:`# ${card.title}\n\n${card.content}`,
    review_status:'curated',metadata:{platform:card.platform,topics:card.topics,checked_at:'2026-11-21'}
  });
  console.log(JSON.stringify({title:card.title,...result}));
}
console.log(JSON.stringify(stats(db)));
db.close();
