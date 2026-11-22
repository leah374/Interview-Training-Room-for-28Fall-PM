export const engineInfo=()=>({mode:process.env.COACH_MODEL_ENDPOINT&&process.env.COACH_MODEL?'model':'rules',model:process.env.COACH_MODEL||null});
export async function modelJSON(system,input) {
  if(engineInfo().mode!=='model') return null;
  const endpoint=new URL(process.env.COACH_MODEL_ENDPOINT);
  if(!['https:','http:'].includes(endpoint.protocol)) throw new Error('模型地址必须为 HTTP(S)');
  const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',...(process.env.COACH_API_KEY?{authorization:`Bearer ${process.env.COACH_API_KEY}`}:{})},
    body:JSON.stringify({model:process.env.COACH_MODEL,messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(input)}],temperature:0.2,response_format:{type:'json_object'}}),signal:AbortSignal.timeout(35000)});
  if(!response.ok) throw new Error(`模型服务返回 ${response.status}`);
  const data=await response.json();
  const text=data.choices?.[0]?.message?.content;
  if(typeof text!=='string') throw new Error('模型未返回有效内容');
  return JSON.parse(text.replace(/^```json\s*|\s*```$/g,''));
}
