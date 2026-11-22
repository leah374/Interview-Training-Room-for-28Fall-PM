import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb, upsertSource, search, stats } from '../src/kb.mjs';

test('reimport is idempotent and search preserves provenance', () => {
  const db=openDb(':memory:');
  const item={id:'x',kind:'professional',title:'出价',source_type:'test',url:'https://example.com',content:'# oCPM\n优化转化，按展示计费。'};
  assert.equal(upsertSource(db,item).changed,true);
  assert.equal(upsertSource(db,item).changed,false);
  assert.equal(stats(db).chunks,1);
  const result=search(db,'oCPM');
  assert.equal(result[0].url,'https://example.com');
  assert.equal(result[0].kind,'professional');
  db.close();
});
