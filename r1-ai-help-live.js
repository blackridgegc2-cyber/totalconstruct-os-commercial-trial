(()=>{
'use strict';
let busy=false;
const token=()=>window.tcAuth?.getAccessToken?.()||localStorage.getItem('tc_access_token')||'';
function append(kind,text){const host=document.getElementById('chat');if(!host)return;const bubble=document.createElement('div');bubble.className='bubble '+kind;bubble.style.whiteSpace='pre-wrap';bubble.textContent=text;host.appendChild(bubble);host.scrollTop=host.scrollHeight;return bubble}
function library(question){const guides=window.tcHelpGuides?.find(question)||[];return 'Help library guidance (not an AI response):\n\n'+(guides.length?guides.map(g=>g.title+'\n'+g.text).join('\n\n'):'Ask about contract scanning, budgets, pay applications, journals, bank reconciliation, access or QuickBooks. Live project records have not been queried.')}
async function send(){
 const input=document.getElementById('aiInput'),q=input?.value.trim();if(!q||busy)return;
 busy=true;const button=document.getElementById('sendAI');if(button)button.disabled=true;input.value='';append('user',q);const reply=append('ai','Checking AI Help…');
 const session=token(),projectId=typeof currentProject==='function'?currentProject()?.id:null;
 try{
  if(!session)throw Error('Sign in to use AI Help.');
  const response=await fetch('/api/ai-help',{method:'POST',headers:{Authorization:'Bearer '+session,'Content-Type':'application/json'},body:JSON.stringify({question:q,page:typeof currentPage==='string'?currentPage:''}),signal:AbortSignal.timeout(95000)}),out=await response.json();
  if(session!==token()||projectId!==(typeof currentProject==='function'?currentProject()?.id:null)){reply.remove();return}
  if(!response.ok)throw Error(out.error||'AI Help unavailable.');
  const refs=(out.guideIds||[]).map(id=>window.tcHelpGuides?.guides.find(g=>g.id===id)?.title).filter(Boolean);
  reply.textContent=out.answer+'\n\n'+out.scope+(refs.length?'\nHelp sources: '+refs.join('; '):'');
 }catch(e){if(session!==token()){reply?.remove();return}reply.textContent=(e.name==='TimeoutError'?'AI Help timed out.':e.message)+'\n\n'+library(q)}
 finally{busy=false;if(button)button.disabled=false}
}
function install(){const button=document.getElementById('sendAI'),input=document.getElementById('aiInput');if(button)button.onclick=send;if(input)input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();send()}};const context=document.getElementById('aiContext');if(context)context.textContent='Product help · live project records are not queried';const trigger=document.getElementById('askAI');if(trigger&&!trigger.dataset.tcHelpBound){trigger.dataset.tcHelpBound='1';trigger.addEventListener('click',()=>{const c=document.getElementById('aiContext');if(c)c.textContent='Product help · live project records are not queried'})}}
addEventListener('tc:r1-ready',install);addEventListener('DOMContentLoaded',install);install();window.tcAiHelp={send};
})();
