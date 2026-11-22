// Browser speech recognition lifecycle; independent of the UI for focused tests.
export function createSpeechInput({Recognition,onState=()=>{},onFinal=()=>{},onInterim=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}){
 let session=null,timer=null,phase='idle';
 const report=(status,message)=>{phase=status;onState({status,message});};
 const clear=()=>{if(timer!==null)clearTimer(timer);timer=null;};
 const release=(current,message)=>{if(session!==current)return;clear();session=null;onInterim('');report('idle',message);};
 const errors={'not-allowed':'麦克风权限未开启，请在浏览器的网站权限中允许麦克风后重试。','service-not-allowed':'当前浏览器不允许语音识别，请改用支持语音识别的浏览器。','audio-capture':'没有可用的麦克风，请检查设备是否连接、被占用或被系统禁用。','network':'语音识别服务连接失败，请检查网络，或换一个支持语音识别的浏览器。','no-speech':'没有识别到声音，请靠近麦克风后重试。','language-not-supported':'当前识别服务不支持所选语言，请切换语言重试。','aborted':'语音输入已停止。'};
 return {
  get supported(){return !!Recognition;},get active(){return session!==null;},get phase(){return phase;},
  start(lang='zh-CN'){
   if(session)return false;
   if(!Recognition){report('unsupported','当前浏览器不支持语音识别。请在支持此功能的浏览器中打开训练室，或继续键盘输入。');return false;}
   let current;try{current=new Recognition();}catch{report('idle','语音识别无法启动，请换用支持此功能的浏览器。');return false;}
   session=current;const seen=new Set();current.lang=lang;current.continuous=true;current.interimResults=true;current.maxAlternatives=1;
   current.onstart=()=>{if(session!==current||phase==='stopping')return;clear();report('listening','正在听，请自然回答。识别完成的句子会追加到回答末尾。');};
   current.onresult=event=>{if(session!==current)return;let interim='';for(let i=0;i<event.results.length;i++){const result=event.results[i],text=result[0]?.transcript||'';if(result.isFinal){if(!seen.has(i)){seen.add(i);if(text.trim())onFinal(text.trim());}}else interim+=text;}onInterim(interim);};
   current.onerror=event=>{if(session!==current)return;release(current,errors[event.error]||'语音识别暂不可用，请重试。已识别的文字仍保留。');try{current.abort();}catch{}};
   current.onend=()=>release(current,'语音输入已结束。请核对文字和专业术语，再提交回答。');
   report('starting','正在申请麦克风，请留意浏览器权限提示…');
   timer=setTimer(()=>{if(session!==current)return;release(current,'麦克风启动超时，请检查权限后重试。');try{current.abort();}catch{}},20000);
   try{current.start();return true;}catch{release(current,'语音输入启动失败，请检查浏览器麦克风权限后重试。');try{current.abort();}catch{}return false;}
  },
  stop(){const current=session;if(!current||phase==='stopping')return;clear();report('stopping','正在结束识别，等待最后一句…');timer=setTimer(()=>{if(session!==current)return;release(current,'已停止；尚未确认的临时片段未写入，请核对回答。');try{current.abort();}catch{}},3500);try{current.stop();}catch{release(current,'已停止语音输入。');try{current.abort();}catch{}}},
  cancel(){const current=session;if(!current)return;release(current,'语音输入已停止，已确认的文字保留在草稿中。');try{current.abort();}catch{}}
 };
}
