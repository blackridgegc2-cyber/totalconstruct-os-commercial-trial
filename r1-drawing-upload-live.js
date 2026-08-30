(()=>{
 'use strict';
 const cfg=()=>window.__TC_SUPABASE__||{};
 const prj=()=>typeof currentProject==='function'?currentProject():null;
 const token=()=>window.tcAuth?.getAccessToken?.()||localStorage.getItem('tc_access_token')||'';
 const notify=(m,o={})=>window.tcNotify?window.tcNotify(m,o):console.log(m);
 const safe=n=>String(n||'drawing').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-140);
 const root=()=>String(cfg().url||'').trim().replace(/\/+$/,'').replace(/\/(rest\/v1|auth\/v1)$/i,'');
 const yieldUI=()=>new Promise(r=>setTimeout(r,0));
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
 async function handle(files,pArg){
  ensure();const p=pArg||prj();if(!p)return;
  for(const file of files){
   const id='DRW-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
   const localUrl=URL.createObjectURL(file);
   const rec={id,project:p.name,projectId:p.id,name:file.name,fileName:file.name,title:file.name.replace(/\.[^.]+$/,''),sheet:'',discipline:classify(file.name),status:'Uploading to project cloud…',type:file.type,url:localUrl,markup:[],sourceImmutable:true,createdAt:new Date().toISOString()};
   state.drawingFiles.push(rec);
   try{if(typeof renderDrawings==='function')renderDrawings()}catch(e){}
   try{
    rec.storagePath=await upload(file,p);rec.status='Stored — scanning drawing set…';
    try{if(typeof renderDrawings==='function')renderDrawings()}catch(e){}
    const x=await scan(file);rec.pageCount=x.pages;rec.extractedText=x.text;rec.status='Stored + text extracted';
    const intake={id:'DOC-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),project:p.name,projectId:p.id,fileName:file.name,fileType:file.type,fileSize:file.size,storagePath:rec.storagePath,category:'Drawing',aiDocumentType:'Drawing',status:'Stored + extracted — indexing',extractedText:x.text,extractedData:{text:x.text,pageCount:x.pages},createdAt:new Date().toISOString(),sourceImmutable:true};
    state.documentIntake.push(intake);
    try{window.tcDocumentIndexer?.process?.(intake)}catch(e){console.warn('Drawing index process',e)}
    rec.status=intake.indexedSheetCount||intake.indexedSpecCount?`Indexed — ${intake.indexedSheetCount||0} sheets / ${intake.indexedSpecCount||0} specs`:'Stored + scanned — review indexing';
    const saveFn=window.save||(typeof save==='function'?save:null);if(typeof saveFn==='function')saveFn('Stored and scanned drawing set',file.name);
    await window.tcCloud?.writeSnapshot?.('Drawing set uploaded, scanned and indexed');
    notify(`${file.name} stored in project cloud and scanned${x.pages?` (${x.pages} page${x.pages===1?'':'s'})`:''}.`,{type:'success',title:'Drawing Set Ready'});
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
 addEventListener('tc:r1-ready',install);addEventListener('DOMContentLoaded',install);setTimeout(install,300);window.tcDrawingUploadLive={handle,upload,scan,install};
})();
