import {spawn} from 'node:child_process';
import {mkdirSync,openSync,closeSync,writeFileSync,readFileSync,existsSync,unlinkSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

const root=fileURLToPath(new URL('..',import.meta.url));
const instance=createHash('sha256').update(root).digest('hex').slice(0,16);
const directory=join(root,'.runtime'),statePath=join(directory,'service.json');
const port=Number(process.env.KB_PORT||8765),url=`http://127.0.0.1:${port}`;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function health(){try{const r=await fetch(url+'/health',{signal:AbortSignal.timeout(1500)});return r.ok?await r.json():null;}catch{return null;}}
const matches=h=>h?.service==='interview-coach'&&h.instance===instance;
async function main(){
  const action=process.argv[2]||'start';
  if(!['start','stop','status'].includes(action))throw Error('Use start, stop or status');
  const current=await health();
  if(action==='status'){console.log(matches(current)?`Running: ${url}`:'Not running');return;}
  if(action==='stop'){
    if(!existsSync(statePath)){console.log('No managed service to stop.');return;}
    const saved=JSON.parse(readFileSync(statePath,'utf8'));
    if(!matches(current)||current.pid!==saved.pid)throw Error('Cannot verify the managed process; no process was stopped.');
    process.kill(saved.pid);unlinkSync(statePath);console.log('Interview Coach stopped.');return;
  }
  if(matches(current)){console.log(`Already running: ${url}`);return;}
  if(current)throw Error(`Port ${port} is used by another service.`);
  mkdirSync(directory,{recursive:true});
  const out=openSync(join(directory,'server.log'),'a'),err=openSync(join(directory,'server-error.log'),'a');
  let child;
  try{child=spawn(process.execPath,[join(root,'src/server.mjs')],{cwd:root,env:process.env,detached:true,windowsHide:true,stdio:['ignore',out,err]});}
  finally{closeSync(out);closeSync(err);}
  let spawnError;child.on('error',e=>{spawnError=e;});child.unref();
  for(let i=0;i<30;i++){
    if(spawnError)throw spawnError;
    const ready=await health();
    if(matches(ready)&&ready.pid===child.pid){writeFileSync(statePath,JSON.stringify({pid:child.pid,port,startedAt:new Date().toISOString()}));console.log(`Running in background: ${url}`);return;}
    await delay(250);
  }
  throw Error('Server did not start. Check .runtime/server-error.log');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
