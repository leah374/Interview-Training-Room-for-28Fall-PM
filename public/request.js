export async function requestJSON(path,data,{fetchImpl=fetch,onConnection=()=>{}}={}){
  const slow=path==='/api/ask'||path.endsWith('/finish')||path.endsWith('/translate');
  let response;
  try{
    response=await fetchImpl(path,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'content-type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(slow?45000:8000)});
  }catch(error){
    if(error.name==='TimeoutError'||error.name==='AbortError')throw Error('请求超时，请稍后重试。已提交的练习可从原页面恢复。');
    onConnection(false);
    throw Error('本地服务未连接。请双击 start.cmd 启动，然后点击「重新连接」。');
  }
  onConnection(true);
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'请求失败');
  return result;
}
