(()=>{
 'use strict';
 const BUCKET='platform-feedback', MAX=50*1024*1024;
 const cfg=()=>window.__TC_SUPABASE__||{};
 const token=()=>window.tcAuth?.getAccessToken?.()||localStorage.getItem('tc_access_token')||'';
 const userId=()=>window.tcAuth?.getUserId?.()||window.currentUser?.id||'';
 const clean=s=>String(s||'file').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-120);
 const notice=(m,o={})=>window.tcNotify?window.tcNotify(m,o):console.warn(m);
 async function upload(file,feedbackId){
  if(!file)throw new Error('Choose a file first.');if(file.size>MAX)throw new Error('Feedback attachments are limited to 50 MB each.');
  const c=cfg(),t=token(),u=userId();if(!c.url||!c.key||!t||!u)throw new Error('Secure cloud session is unavailable. Sign in again and retry.');
  const path=`${u}/${feedbackId}/${Date.now()}-${clean(file.name)}`;
  const r=await fetch(`${c.url}/storage/v1/object/${BUCKET}/${encodeURI(path)}`,{method:'POST',headers:{apikey:c.key,authorization:`Bearer ${t}`,'content-type':file.type||'application/octet-stream','x-upsert':'false'},body:file});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.message||data.error||'Attachment upload failed.');
  return {bucket:BUCKET,path,name:file.name,type:file.type||'',size:file.size,uploadedAt:new Date().toISOString()};
 }
 async function chooseAndUpload(feedbackId){
  return new Promise((resolve,reject)=>{const input=document.createElement('input');input.type='file';input.multiple=true;input.accept='image/jpeg,image/png,image/webp,application/pdf,text/plain';input.onchange=async()=>{try{const out=[];for(const f of [...input.files])out.push(await upload(f,feedbackId));resolve(out)}catch(e){reject(e)}};input.click()})
 }
 async function addToRecord(record){
  if(!record?.id)return;try{const files=await chooseAndUpload(record.id);if(!files.length)return;record.attachments=[...(record.attachments||[]),...files];record.updatedAt=new Date().toISOString();window.save?.('Added feedback attachment',record.id);await window.tcFeedbackCloud?.push?.(record);window.tcFeedbackCenter?.render?.();notice(`${files.length} attachment${files.length===1?'':'s'} added.`,{type:'success',title:'Feedback Updated'})}catch(e){notice(e.message||'Attachment upload failed.',{type:'error',title:'Attachment Failed'})}
 }
 function wire(){const panel=document.getElementById('tcFeedbackPanel');if(!panel)return;panel.querySelectorAll('tr').forEach(row=>{const id=row.querySelector('td b')?.textContent||'';if(!/^FB-/.test(id)||row.querySelector('.tcFbAttach'))return;const rec=window.tcFeedbackCenter?.list?.().find(x=>x.id===id);if(!rec)return;const td=row.querySelector('.fb-desc');if(!td)return;const wrap=document.createElement('div');wrap.className='small section';const count=(rec.attachments||[]).length;wrap.innerHTML=`<span>${count} attachment${count===1?'':'s'}</span> `;const b=document.createElement('button');b.className='btn tcFbAttach';b.textContent='Add Screenshot / File';b.onclick=()=>addToRecord(rec);wrap.appendChild(b);td.appendChild(wrap)})}
 new MutationObserver(wire).observe(document.documentElement,{subtree:true,childList:true});addEventListener('DOMContentLoaded',wire);setTimeout(wire,1200);
 window.tcFeedbackAttachments={upload,chooseAndUpload,addToRecord};
})();