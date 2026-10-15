(()=>{'use strict';if(window.tcAiProjectIntake)return;
function loadProjectCreator(){if(window.tcCanonicalProjectCreate){window.tcCanonicalProjectCreate.install?.();return}if(document.querySelector('script[data-tc-project-create]'))return;const s=document.createElement('script');s.src='/r1-project-create-safe.js';s.async=false;s.dataset.tcProjectCreate='1';s.onload=()=>window.tcCanonicalProjectCreate?.install?.();s.onerror=()=>console.warn('Canonical project initializer failed to load');document.body.appendChild(s)}
const token=()=>window.tcAuth?.getAccessToken?.()||localStorage.getItem('tc_access_token')||'';
async function prepare(file){
 if(/\.(pdf|doc|docx)$/i.test(file.name)){
  if(file.size>2*1024*1024)throw Error(file.name+': split this document into files of 2 MB or smaller for scanning.');
  const types={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'},type=types[file.name.split('.').pop().toLowerCase()];
  const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return {name:file.name,type,fileData:'data:'+type+';base64,'+btoa(binary)};
 }
 if(/\.(xlsx|xls)$/i.test(file.name)){
  await window.tcLoadDocumentLibraries?.();if(!window.XLSX)throw Error('Spreadsheet reader unavailable. Retry the upload.');
  const wb=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true}),sheets=wb.SheetNames.map(name=>({worksheet:name,rows:window.XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',raw:false}).map((values,i)=>({row:i+1,values}))}));
  return {name:file.name,type:file.type||'application/octet-stream',text:JSON.stringify(sheets)};
 }
 if(/^text\//.test(file.type)||/\.(txt|csv|json)$/i.test(file.name))return {name:file.name,type:file.type||'text/plain',text:await file.text()};
 throw Error(file.name+': choose PDF, DOC, DOCX, XLS, XLSX, CSV, TXT or JSON.');
}
async function analyze(files){
 const t=token();if(!t)throw Error('Sign in before using AI scanning.');const docs=[];for(const file of files)docs.push(await prepare(file));
 if(JSON.stringify(docs).length>3500000)throw Error('Combined documents exceed the scan limit. Scan fewer documents at a time.');
 const r=await fetch('/api/project-intake',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify({files:docs})}),out=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(out.error||'AI scan failed. No data was applied.');
 if(token()!==t)throw Error('Your login changed during scanning. Run the scan again.');
 const sources={};for(const[k,v]of Object.entries(out.sources||{}))sources[k]=[v.document,v.page&&'page / sheet '+v.page,v.quote,Number.isFinite(v.confidence)&&Math.round(v.confidence*100)+'% confidence'].filter(Boolean).join(' · ');
 return {...out,sources,sourceDetails:out.sources};
}
window.tcAiProjectIntake={analyze,prepare};loadProjectCreator();})();
