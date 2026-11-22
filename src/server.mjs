import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {openDb,search,stats,upsertSource} from './kb.mjs';
import {translateAttempt,initCoach,dashboard,saveSettings,buildPlan,startAttempt,attempt,assist,recordAnswer,finishAttempt,abandon,history,askKnowledge} from './coach.mjs';
const assets={'/speech.js':['speech.js','text/javascript; charset=utf-8'],'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/request.js':['request.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8']};
export const instanceId=createHash('sha256').update(fileURLToPath(new URL('..',import.meta.url))).digest('hex').slice(0,16);
const send=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data));};
const body=async req=>{let data='';for await(const part of req){data+=part;if(data.length>1_000_000)throw Error('内容超过上限');}return JSON.parse(data||'{}');};
export function createServer(db=openDb()){
  initCoach(db);const busy=new Set();
  return http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self'; connect-src 'self'; frame-ancestors 'none'");
    try{
      const u=new URL(req.url,'http://localhost');
      if(req.method==='POST'){
        if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(res,403,{error:'不允许跨站写入'});
        if(!String(req.headers['content-type']).includes('application/json'))return send(res,415,{error:'需要 JSON 请求体'});
      }
      if(req.method==='GET'&&assets[u.pathname]){const [file,type]=assets[u.pathname];res.writeHead(200,{'content-type':type,'cache-control':'no-cache'});return res.end(readFileSync(new URL('../public/'+file,import.meta.url)));}
      if(req.method==='GET'&&u.pathname==='/health')return send(res,200,{ok:true,service:'interview-coach',instance:instanceId,pid:process.pid,stats:stats(db)});
      if(req.method==='GET'&&u.pathname==='/api/dashboard')return send(res,200,dashboard(db));
      if(req.method==='POST'&&u.pathname==='/api/settings')return send(res,200,saveSettings(db,await body(req)));
      if(req.method==='POST'&&u.pathname==='/api/plan')return send(res,200,buildPlan(db,await body(req)));
      if(req.method==='POST'&&u.pathname==='/api/attempts')return send(res,201,startAttempt(db,await body(req)));
      const m=/^\/api\/attempts\/([a-zA-Z0-9-]+)(?:\/(answer|finish|assist|abandon|translate))?$/.exec(u.pathname);
      if(m){
        if(req.method==='GET'&&!m[2])return send(res,200,attempt(db,m[1]));
        if(req.method==='POST'){
          if(busy.has(m[1]))return send(res,409,{error:'评估正在进行，请稍候'});
          const b=await body(req);
          if(busy.has(m[1]))return send(res,409,{error:'评估正在进行，请稍候'});
          if(m[2]==='translate')return send(res,200,await translateAttempt(db,m[1],b));
          if(m[2]==='answer')return send(res,200,recordAnswer(db,m[1],b.answer));
          if(m[2]==='assist')return send(res,200,assist(db,m[1],b.kind));
          if(m[2]==='abandon')return send(res,200,abandon(db,m[1]));
          if(m[2]==='finish'){busy.add(m[1]);try{return send(res,200,await finishAttempt(db,m[1],b.answer||''));}finally{busy.delete(m[1]);}}
        }
      }
      if(req.method==='GET'&&u.pathname==='/api/history')return send(res,200,history(db));
      if(req.method==='GET'&&u.pathname==='/api/library')return send(res,200,db.prepare(`SELECT s.id,s.kind,s.title,s.url,s.publisher,s.review_status,s.fetched_at,length(s.raw_content) characters,COUNT(c.id) chunks FROM sources s LEFT JOIN chunks c ON c.source_id=s.id GROUP BY s.id ORDER BY s.kind,s.title`).all());
      if(req.method==='GET'&&u.pathname==='/api/source'){const row=db.prepare('SELECT id,title,kind,raw_content,url FROM sources WHERE id=?').get(u.searchParams.get('id'));return send(res,row?200:404,row||{error:'资料不存在'});}
      if(req.method==='POST'&&u.pathname==='/api/library'){
        const b=await body(req);if(!['professional','interview','personal'].includes(b.kind)||typeof b.title!=='string'||!b.title.trim()||typeof b.content!=='string'||b.content.trim().length<10)throw Error('请填写类型、标题和至少 10 字正文');
        if(b.url&&!/^https?:\/\//i.test(b.url))throw Error('来源链接需为 HTTP(S)');
        const id='local:'+randomUUID();return send(res,201,{id,...upsertSource(db,{id,kind:b.kind,title:b.title.slice(0,180),content:b.content,url:b.url||null,publisher:'本人补充',source_type:'manual',review_status:b.kind==='personal'?'self_reported':'unverified'})});
      }
      if(req.method==='POST'&&u.pathname==='/api/ask'){const b=await body(req);return send(res,200,await askKnowledge(db,b.query));}
      if(req.method==='GET'&&u.pathname==='/v1/search')return send(res,200,{results:search(db,u.searchParams.get('q'),{kind:u.searchParams.get('kind'),limit:u.searchParams.get('limit')})});
      if(req.method==='POST'&&u.pathname==='/v1/context'){const b=await body(req);return send(res,200,Object.fromEntries(['professional','interview','personal','practice'].map(kind=>[kind,search(db,b.query,{kind,limit:b.limit||5})])));}
      if(req.method==='POST'&&u.pathname==='/v1/personal'){const b=await body(req);if(!b.title||!b.content||b.confirmed_by_user!==true)throw Error('需要标题、正文和用户确认');const id=b.id||randomUUID();return send(res,200,{id,...upsertSource(db,{id:'personal:'+id,kind:'personal',title:b.title,content:b.content,source_type:'personal_experience',publisher:'本人',review_status:'self_reported'})});}
      if(req.method==='POST'&&u.pathname==='/v1/practice/sessions'){const b=await body(req);if(!b.target_role)throw Error('target_role required');const id=randomUUID();db.prepare('INSERT INTO practice_sessions(id,target_role,started_at) VALUES(?,?,?)').run(id,b.target_role,new Date().toISOString());return send(res,201,{id});}
      if(req.method==='POST'&&u.pathname==='/v1/practice/turns'){const b=await body(req);if(!b.session_id||!b.question||!b.answer)throw Error('session_id, question, answer required');const score=b.score===undefined?null:Number(b.score);if(score!==null&&(!Number.isFinite(score)||score<0||score>5))throw Error('score must be 0–5');const id=randomUUID();db.prepare('INSERT INTO practice_turns(id,session_id,question,answer,topic,asked_at,feedback_json,score) VALUES(?,?,?,?,?,?,?,?)').run(id,b.session_id,b.question,b.answer,b.topic||null,new Date().toISOString(),b.feedback?JSON.stringify(b.feedback):null,score);return send(res,201,{id,note:'旧版接口只记录证据，不直接更新新的能力画像'});}
      if(req.method==='GET'&&u.pathname==='/v1/practice/weaknesses')return send(res,200,{items:db.prepare('SELECT * FROM coach_mastery ORDER BY score ASC').all()});
      send(res,404,{error:'未找到接口'});
    }catch(error){send(res,400,{error:error.message});}
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const server=createServer();const port=Number(process.env.KB_PORT||8765);
  server.listen(port,'127.0.0.1',()=>console.log(`Interview Coach: http://127.0.0.1:${port}`));
}
