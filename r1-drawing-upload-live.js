(()=>{
 'use strict';
 const cfg=()=>window.__TC_SUPABASE__||{};
 const prj=()=>typeof currentProject==='function'?currentProject():null;
 const token=()=>window.tcAuth?.getAccessToken?.()||localStorage.getItem('tc_access_token')||'';
 const notify=(m,o={})=>window.tcNotify?window.tcNotify(m,o):console.log(m);
 const safe=n=>String(n||'drawing').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-140);
 const root=()=>String(cfg().url||'').trim().replace(/\/+$/,'').replace(/\/(rest\/v1|auth\/v1)$/i,'');
 const yieldUI=()=>new Promise(r=>setTimeout(r,0));
 const now=()=>new Date().toISOString();
 function ensure(){state.drawingFiles=state.drawingFiles||[];state.documentIntake=state.documentIntake||[]}
 async function upload(file,p){
  if(!token())throw new Error('Sign in again before uploading drawings.');
  const path=`${p.id}/drawings/${Date.now()}-${Math.random().toString(36).slice(2,7)}-${safe(file.name)}`;
  const url=`${root()}/storage/v1/object/project-documents/${path.split('/').map(encodeURIComponent).join('/')}`;
  const r=await fetch(url,{method:'POST',headers:{apikey:cfg().key,Authorization:`Bearer ${token()}`,'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});
  if(!r.ok)throw new Error(`Drawing cloud upload failed (${r.status}): ${await r.text()}`);
  return path;
 }
 async function pdfText(file){
  await window.tcLoadDocumentLibraries?.();
  if(!window.pdfjsLib)throw new Error('PDF reader did not load.');
  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  let out='';
  for(let i=1;i<=pdf.numPages;i++){
   const pg=await pdf.getPage(i),c=await pg.getTextContent();
   out+=`\n--- PAGE ${i} ---\n`+c.items.map(x=>x.str).join(' ');
   if(i%3===0)await yieldUI();
  }
  return {text:out,pages:pdf.numPages};
 }
 async function scan(file){
  if(/pdf/i.test(file.type)||/\.pdf$/i.test(file.name))return pdfText(file);
  return {text:`Drawing image: ${file.name}`,pages:1};
 }
 function classify(name){return typeof window.classifyDrawing==='function'?window.classifyDrawing(name):(/\bA[-_ ]?\d/i.test(name)?'Architectural':'Other / Review')}
 function parseRevision(name=''){const s=String(name);return s.match(/(?:\brev(?:ision)?[\s._-]*|[_-]r)([A-Z0-9]{1,6})(?=[_. -]|$)/i)?.[1]||''}
 function sourceRef(rec){return {id:rec.id,versionId:rec.versionId||rec.id,name:rec.fileName||rec.name,revision:rec.revision||'',issueDate:rec.issueDate||rec.createdAt||'',sheet:rec.sheet||'',sourceType:'Drawing',storagePath:rec.storagePath||'',sourceImmutable:true}}
 async function intakeChoice(file){const gov=window.tcAiDocumentGovernance;if(!gov?.askAiRead)return {read:true,purpose:'Populate / Update Project Data',overwritePolicy:'confirm'};return await gov.askAiRead({fileName:file.name,purpose:'Populate / Update Project Data'})||{read:false,purpose:'Reference / File Only'} }
 async function handle(files,pArg){
  ensure();const p=pArg||prj();if(!p)return;
  for(const file of files){
   const choice=await intakeChoice(file);if(choice===false)continue;
   const id='DRW-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),createdAt=now();
   const localUrl=URL.createObjectURL(file);
   const rec={id,versionId:id,project:p.name,projectId:p.id,name:file.name,fileName:file.name,title:file.name.replace(/\.[^.]+$/,''),sheet:'',revision:parseRevision(file.name),issueDate:'',discipline:classify(file.name),status:'Uploading to project cloud…',type:file.type,url:localUrl,markup:[],sourceImmutable:true,createdAt,aiReadRequested:choice.read!==false,aiReadPurpose:choice.purpose||'',overwritePolicy:'Confirm before replacing existing values'};
   state.drawingFiles.push(rec);
   try{if(typeof renderDrawings==='function')renderDrawings()}catch(e){}
   try{
    rec.storagePath=await upload(file,p);rec.sourceReference=sourceRef(rec);rec.status=choice.read===false?'Stored — source preserved':'Stored — scanning drawing set…';
    const intake={id:'DOC-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),project:p.name,projectId:p.id,fileName:file.name,fileType:file.type,fileSize:file.size,storagePath:rec.storagePath,category:'Drawing',aiDocumentType:'Drawing',status:choice.read===false?'Stored Only':'Stored — extracting',createdAt:now(),sourceImmutable:true,sourceReference:rec.sourceReference,aiReadRequested:choice.read!==false,aiReadStatus:choice.read===false?'Stored Only':'AI Review Requested',overwritePolicy:'Confirm before replacing existing values',sourceTraceability:true};
    window.tcAiDocumentGovernance?.markIntake?.(intake,choice);
    state.documentIntake.push(intake);
    if(choice.read===false){rec.status='Stored Only — immutable source retained';const saveFn=window.save||(typeof save==='function'?save:null);saveFn?.('Stored drawing source without AI processing',file.name);await window.tcCloud?.writeSnapshot?.('Drawing source uploaded and retained without AI processing');notify(`${file.name} stored in project cloud without AI extraction.`,{type:'success',title:'Drawing Stored'});}
    else{
     try{if(typeof renderDrawings==='function')renderDrawings()}catch(e){}
     const x=await scan(file);rec.pageCount=x.pages;rec.extractedText=x.text;rec.status='Stored + text extracted';intake.status='Stored + extracted — indexing';intake.extractedText=x.text;intake.extractedData={text:x.text,pageCount:x.pages};
     try{window.tcDocumentIndexer?.process?.(intake)}catch(e){console.warn('Drawing index process',e)}
     rec.status=intake.indexedSheetCount||intake.indexedSpecCount?`Indexed — ${intake.indexedSheetCount||0} sheets / ${intake.indexedSpecCount||0} specs`:'Stored + scanned — review indexing';
     rec.sourceReference=sourceRef(rec);intake.sourceReference=rec.sourceReference;
     const saveFn=window.save||(typeof save==='function'?save:null);saveFn?.('Stored and scanned drawing set',file.name);
     await window.tcCloud?.writeSnapshot?.('Drawing set uploaded, scanned and indexed with immutable source reference');
     notify(`${file.name} stored in project cloud and scanned${x.pages?` (${x.pages} page${x.pages===1?'':'s'})`:''}. Source revision is preserved for downstream document references.`,{type:'success',title:'Drawing Set Ready'});
    }
   }catch(e){rec.status='Upload / scan failed';rec.uploadError=e.message;notify(`${file.name}: ${e.message}`,{type:'error',title:'Drawing Upload Failed'})}
   try{if(typeof renderDrawings==='function')renderDrawings();window.tcDocumentIndexer?.renderControl?.();window.tcDrawingWorkspace?.render?.()}catch(e){}
   await yieldUI();
  }
 }
 async function storageBlob(path){
  if(!path||!token())throw new Error('Stored drawing source unavailable.');
  const url=`${root()}/storage/v1/object/authenticated/project-documents/${path.split('/').map(encodeURIComponent).join('/')}`;
  const r=await fetch(url,{headers:{apikey:cfg().key,Authorization:`Bearer ${token()}`}});if(!r.ok)throw new Error(`Unable to open stored drawing (${r.status})`);return r.blob();
 }
 function install(){
  ensure();
  if(typeof window.handleDrawingFiles==='function'&&!window.handleDrawingFiles.__tcLive){const fn=(files,p)=>handle(files,p);fn.__tcLive=true;window.handleDrawingFiles=fn}
  if(typeof window.openDrawing==='function'&&!window.openDrawing.__tcLive){const original=window.openDrawing;const fn=async id=>{const f=(state.drawingFiles||[]).find(x=>String(x.id)===String(id));if(f&&!f.url&&f.storagePath){try{f.url=URL.createObjectURL(await storageBlob(f.storagePath))}catch(e){notify(e.message,{type:'error',title:'Drawing Open Failed'});return}}return original(id)};fn.__tcLive=true;window.openDrawing=fn}
 }
 addEventListener('tc:r1-ready',install);addEventListener('DOMContentLoaded',install);setTimeout(install,300);window.tcDrawingUploadLive={handle,upload,scan,sourceRef,parseRevision,install};
})();
