import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const DB_PATH = resolve(process.env.KB_DB || 'data/interview.sqlite');
export const KINDS = ['professional', 'interview', 'personal', 'practice'];
export const hash = text => createHash('sha256').update(text).digest('hex');

export function openDb(path = DB_PATH) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('professional','interview','personal','practice')),
      title TEXT NOT NULL, url TEXT, publisher TEXT, source_type TEXT NOT NULL,
      source_updated_at TEXT, fetched_at TEXT NOT NULL, review_status TEXT NOT NULL DEFAULT 'source_material',
      content_hash TEXT NOT NULL, raw_content TEXT NOT NULL, metadata_json TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
      ordinal INTEGER NOT NULL, section TEXT NOT NULL, body TEXT NOT NULL,
      UNIQUE(source_id, ordinal)
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(section, body, content='chunks', content_rowid='id', tokenize='trigram');
    CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
      INSERT INTO chunks_fts(rowid,section,body) VALUES(new.id,new.section,new.body);
    END;
    CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
      INSERT INTO chunks_fts(chunks_fts,rowid,section,body) VALUES('delete',old.id,old.section,old.body);
    END;
    CREATE TABLE IF NOT EXISTS practice_sessions (
      id TEXT PRIMARY KEY, target_role TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT
    );
    CREATE TABLE IF NOT EXISTS practice_turns (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES practice_sessions(id),
      question TEXT NOT NULL, answer TEXT NOT NULL, topic TEXT,
      asked_at TEXT NOT NULL, feedback_json TEXT, score REAL,
      CHECK(score IS NULL OR (score>=0 AND score<=5))
    );
    CREATE TABLE IF NOT EXISTS weaknesses (
      topic TEXT PRIMARY KEY, attempts INTEGER NOT NULL, mean_score REAL NOT NULL,
      last_practiced_at TEXT NOT NULL
    );
  `);
  return db;
}

export function chunkMarkdown(content, maxChars = 1600) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let section = '正文', body = '';
  function flush() {
    const text = body.trim();
    if (!text) return;
    if (text.length <= maxChars) out.push({ section, body: text });
    else {
      let start = 0;
      while (start < text.length) {
        let end = Math.min(start + maxChars, text.length);
        if (end < text.length) {
          const cut = text.lastIndexOf('\n', end);
          if (cut > start + maxChars / 2) end = cut;
        }
        out.push({ section, body: text.slice(start, end).trim() });
        start = end;
      }
    }
    body = '';
  }
  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) { flush(); section = heading[2].trim(); }
    else if (!/^<\/?(?:fragment|title)\b/.test(line.trim())) body += line + '\n';
  }
  flush();
  return out;
}

export function upsertSource(db, item) {
  if (!KINDS.includes(item.kind)) throw new Error('Invalid kind');
  const content = item.content || '';
  const digest = hash(content);
  const previous = db.prepare('SELECT content_hash FROM sources WHERE id=?').get(item.id);
  if (previous?.content_hash === digest) return { changed: false, chunks: 0 };
  const chunks = chunkMarkdown(content);
  db.exec('BEGIN');
  try {
    db.prepare(`INSERT INTO sources(id,kind,title,url,publisher,source_type,source_updated_at,fetched_at,review_status,content_hash,raw_content,metadata_json)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
      kind=excluded.kind,title=excluded.title,url=excluded.url,publisher=excluded.publisher,
      source_type=excluded.source_type,source_updated_at=excluded.source_updated_at,
      fetched_at=excluded.fetched_at,review_status=excluded.review_status,
      content_hash=excluded.content_hash,raw_content=excluded.raw_content,metadata_json=excluded.metadata_json`).run(
      item.id,item.kind,item.title,item.url||null,item.publisher||null,item.source_type,
      item.source_updated_at||null,new Date().toISOString(),item.review_status||'source_material',
      digest,content,JSON.stringify(item.metadata||{})
    );
    db.prepare('DELETE FROM chunks WHERE source_id=?').run(item.id);
    const insert = db.prepare('INSERT INTO chunks(source_id,ordinal,section,body) VALUES(?,?,?,?)');
    chunks.forEach((c,i)=>insert.run(item.id,i,c.section,c.body));
    db.exec('COMMIT');
    return { changed: true, chunks: chunks.length };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function search(db, query, { kind, limit = 8 } = {}) {
  query = String(query || '').trim();
  if (!query) return [];
  if (kind && !KINDS.includes(kind)) throw new Error('Invalid kind');
  limit = Math.max(1, Math.min(Number(limit)||8, 30));
  const terms = [...new Set((query.match(/[\p{Script=Han}]{2,}|[A-Za-z][A-Za-z0-9_-]*/gu)||[]).flatMap(t => {
    if (/[\p{Script=Han}]/u.test(t) && t.length > 5) return [t, ...Array.from({length:t.length-2},(_,i)=>t.slice(i,i+3))];
    return [t];
  }))].slice(0, 12);
  const candidates = new Map();
  const where = kind ? 'AND s.kind=?' : '';
  for (const term of terms) {
    const pattern = `%${term.replace(/[\\%_]/g, '\\$&')}%`;
    const rows = db.prepare(`SELECT c.id,c.section,c.body,s.id source_id,s.kind,s.title,s.url,s.publisher,s.review_status
      FROM chunks c JOIN sources s ON s.id=c.source_id WHERE (c.section LIKE ? ESCAPE '\\' OR c.body LIKE ? ESCAPE '\\') ${where} LIMIT 300`).all(
      ...(kind ? [pattern,pattern,kind] : [pattern,pattern]));
    for (const row of rows) {
      const score = (candidates.get(row.id)?.score||0) + (row.section.includes(term)?3:1) + (row.body.includes(query)?2:0);
      candidates.set(row.id,{...row,score});
    }
  }
  const practice = (!kind || kind === 'practice') ? db.prepare(`SELECT id,question,answer,topic,feedback_json,asked_at,score
    FROM practice_turns WHERE question LIKE ? OR answer LIKE ? OR topic LIKE ?
    ORDER BY asked_at DESC LIMIT ?`).all(`%${query}%`,`%${query}%`,`%${query}%`,limit).map(r=>({
      id:r.id,source_id:r.id,kind:'practice',title:r.topic||'练习记录',url:null,publisher:'本人',
      review_status:'practice_feedback',section:r.question,excerpt:`回答：${r.answer.slice(0,900)}\n反馈：${r.feedback_json||'暂无'}`,
      score:1,asked_at:r.asked_at,practice_score:r.score
    })) : [];
  return [...candidates.values()].sort((a,b)=>b.score-a.score).slice(0,limit).map(r=>({
    ...r, excerpt:r.body.slice(0,1200), body:undefined
  })).concat(practice).slice(0,limit);
}

export function stats(db) {
  return { sources: db.prepare('SELECT kind,COUNT(*) count FROM sources GROUP BY kind').all(),
    chunks: db.prepare('SELECT COUNT(*) count FROM chunks').get().count,
    sessions: db.prepare('SELECT COUNT(*) count FROM practice_sessions').get().count,
    turns: db.prepare('SELECT COUNT(*) count FROM practice_turns').get().count };
}
