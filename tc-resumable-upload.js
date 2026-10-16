(function(root){'use strict';
const MB=1024*1024,scope=()=>({project:typeof currentProject==='function'?currentProject()?.id:'',user:root.tcAuth?.getUserId?.()||''});
const same=s=>{const n=scope();return s.project===n.project&&s.user===n.user&&!!root.tcAuth?.getAccessToken?.()};
let loading;
async function library(){if(root.tus?.Upload)return root.tus;if(!loading)loading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/vendor/tus-4.3.1.min.js';script.onload=()=>root.tus?.Upload?resolve(root.tus):reject(Error('Resumable upload library unavailable'));script.onerror=()=>{loading=null;reject(Error('Resumable upload library could not load'))};document.body.append(script)});return loading}
function storageOrigin(){const u=new URL(root.__TC_SUPABASE__.url);if(/^[a-z0-9]+\.supabase\.co$/.test(u.hostname))u.hostname=u.hostname.replace('.supabase.co','.storage.supabase.co');return u.origin}
async function upload(file,path,onProgress=()=>{}){
 const boundary=scope();if(!same(boundary)||!path.startsWith(boundary.project+'/drawings/'))throw Error('Select the drawing project and sign in');
 const limit=Number(root.__TC_SUPABASE__.projectDocumentMaxBytes)||250*MB;if(file.size>limit)throw Error('Current project storage limit is '+Math.round(limit/MB)+' MiB per file. The requested 2 GB capacity has not been verified.');
 const tus=await library(),origin=storageOrigin(),endpoint=origin+'/storage/v1/upload/resumable';
 const trusted=url=>{try{const u=new URL(url);return u.origin===origin&&u.pathname.startsWith('/storage/v1/upload/resumable')}catch{return false}};
 if(!same(boundary))throw Error('Project or login changed before upload');
 const fingerprint=['totalconnect-drawing-v1',origin,boundary.user,boundary.project,file.name,file.type,file.size,file.lastModified].join('|');
 return new Promise((resolve,reject)=>{
  let storedPath=path;
  const job=new tus.Upload(file,{endpoint,chunkSize:6*MB,retryDelays:[0,3000,5000,10000,20000],uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,headers:{'x-upsert':'false'},metadata:{bucketName:'project-documents',objectName:path,contentType:file.type||'application/octet-stream',cacheControl:'3600'},fingerprint:async()=>fingerprint,
   onBeforeRequest:async request=>{if(!same(boundary)||!trusted(request.getURL()))throw Error('Upload stopped: project/login changed or untrusted upload URL');await root.tcAuth?.ensureSession?.();if(!same(boundary))throw Error('Upload session changed');request.setHeader('Authorization','Bearer '+root.tcAuth.getAccessToken());request.setHeader('apikey',root.__TC_SUPABASE__.key)},
   onShouldRetry:error=>{const status=error.originalResponse?.getStatus?.()||0;return same(boundary)&&(!status||[408,409,423,429].includes(status)||status>=500)},
   onProgress:(sent,total)=>{if(same(boundary))onProgress(sent,total)},
   onError:e=>reject(Error('Upload interrupted. Reselect the same file in the same project to resume. '+e.message)),
   onSuccess:()=>same(boundary)?resolve(storedPath):reject(Error('Upload finished for the previous project/login. Reopen that project to review it.'))});
  job.findPreviousUploads().then(previous=>{if(!same(boundary))throw Error('Project or login changed');const candidate=previous.find(x=>trusted(x.uploadUrl)&&x.metadata?.bucketName==='project-documents'&&x.metadata.objectName.startsWith(boundary.project+'/drawings/'));if(candidate){storedPath=candidate.metadata.objectName;job.resumeFromPreviousUpload(candidate)}job.start()}).catch(reject);
 });
}
root.tcResumableUpload={upload,storageOrigin};
})(window);
