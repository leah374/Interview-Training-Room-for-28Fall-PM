import { openDb, search, stats } from './kb.mjs';

const db=openDb();
const query=process.argv.slice(2).join(' ').trim();
if (!query) {
  console.log(JSON.stringify({usage:'node src/query.mjs <问题或关键词>',stats:stats(db)},null,2));
} else {
  console.log(JSON.stringify({query,professional:search(db,query,{kind:'professional',limit:5}),
    interview:search(db,query,{kind:'interview',limit:5}),
    personal:search(db,query,{kind:'personal',limit:5}),
    practice:search(db,query,{kind:'practice',limit:5})},null,2));
}
db.close();
