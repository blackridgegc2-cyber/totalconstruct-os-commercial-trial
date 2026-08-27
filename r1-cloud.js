(()=>{
 const cfg=window.__TC_SUPABASE__||{};
 if(!cfg.url||!cfg.key)return;
 const root=String(cfg.url).trim().replace(/\/+$/,'').replace(/\/(rest\/v1|auth\/v1)$/i,'');
 const API=root+'/rest/v1';
 const tracked=['meetings','daily','tasks','tm','quality','incidents','warranties','subcontractorProfiles','compliance','closeoutItems','warrantyRequests','bidders','savedReports','procurement','contracts','correspondence','costLines','purchases','fieldReports','aeObservations','projectPhotos','designIssues','veItems','ownerDecisions','projectStatusUpdates'];
 const companyTracked=['equipment','fixedAssets','payroll401k'];
 function token(){return localStorage.getItem('tc_access_token')||''}
 function headers(extra={}){return Object.assign({'apikey':cfg.key,'Content-Type':'application/json','Prefer':'return=representation'},token()?{'Authorization':'Bearer '+token()}: {},extra)}
 async function rest(table,query=''){const r=await fetch(`${API}/${table}${query}`,{headers:headers()});if(!r.ok)throw new Error(`${table}: ${r.status} ${await r.text()}`);return r.json()}
 async function insert(table,body){const r=await fetch(`${API}/${table}`,{method:'POST',headers:headers(),body:JSON.stringify(body)});if(!r.ok)throw new Error(`${table}: ${r.status} ${await r.text()}`);return r.json()}
 function current(){try{return typeof currentProject==='function'?currentProject():null}catch(e){return null}}
 function belongs(row,prj){if(!row||typeof row!=='object')return false;const pid=row.project_id??row.projectId??row.projectID;const pname=row.project??row.project_name??row.projectName;return String(pid||'')===String(prj.id)||String(pname||'')===String(prj.name)}
 function scopedValue(key,val,prj){if(!Array.isArray(val))return val;if(companyTracked.includes(key))return undefined;return val.filter(row=>belongs(row,prj))}
 function snapshot(prj){const data={};for(const k of tracked){if(!state||state[k]===undefined)continue;const v=scopedValue(k,state[k],prj);if(v!==undefined)data[k]=v}return {kind:'r1_runtime_snapshot',version:2,scope:'project',project_id:prj.id,project_name:prj.name,saved_at:new Date().toISOString(),state:data}}
 function mergeScoped(key,incoming,prj){if(!Array.isArray(incoming)){state[key]=incoming;return}const existing=Array.isArray(state[key])?state[key]:[];state[key]=existing.filter(row=>!belongs(row,prj)).concat(incoming)}
 let writing=false,pending=false,lastLoaded='';
 async function writeSnapshot(action='Saved data',record='System'){
  const prj=current();if(!prj?.id||!token())return false;
  if(writing){pending=true;return false}writing=true;
  try{
   const payload=snapshot(prj);payload.action=action;payload.record=record;
   await insert('form_instances',{project_id:prj.id,title:'R1 Runtime Snapshot',status:'complete',form_data:payload,completed_at:new Date().toISOString()});
   state.persistenceHealth=state.persistenceHealth||{};state.persistenceHealth.lastCloudWrite=new Date().toISOString();state.persistenceHealth.cloudError=null;
   return true;
  }catch(e){state.persistenceHealth=state.persistenceHealth||{};state.persistenceHealth.cloudError=e.message;console.warn('TotalConstruct cloud snapshot failed',e);return false}
  finally{writing=false;if(pending){pending=false;setTimeout(()=>writeSnapshot('Queued save','System'),150)}}
 }
 async function loadSnapshot(force=false){
  const prj=current();if(!prj?.id||!token())return false;if(!force&&lastLoaded===prj.id)return true;
  try{
   const rows=await rest('form_instances',`?project_id=eq.${encodeURIComponent(prj.id)}&title=eq.${encodeURIComponent('R1 Runtime Snapshot')}&select=form_data,updated_at,created_at&order=created_at.desc&limit=1`);
   const snap=rows?.[0]?.form_data;
   if(snap?.kind==='r1_runtime_snapshot'&&snap.state){
    for(const [k,v] of Object.entries(snap.state)){if(snap.version>=2&&snap.scope==='project')mergeScoped(k,v,prj);else if(Array.isArray(v))mergeScoped(k,v.filter(row=>belongs(row,prj)),prj)}
    lastLoaded=prj.id;state.persistenceHealth=state.persistenceHealth||{};state.persistenceHealth.lastCloudLoad=new Date().toISOString();state.persistenceHealth.cloudError=null;if(typeof renderAll==='function')renderAll();if(typeof refreshBanner==='function')refreshBanner();return true
   }
  }catch(e){state.persistenceHealth=state.persistenceHealth||{};state.persistenceHealth.cloudError=e.message;console.warn('TotalConstruct cloud reopen failed',e)}return false
 }
 window.tcCloud={rest,insert,writeSnapshot,loadSnapshot,snapshot,belongs};
 function wrapSave(){if(typeof window.save!=='function'||window.save.__tcCloudWrapped)return;const original=window.save;const wrapped=function(action='Saved data',record='System'){const out=original.apply(this,arguments);setTimeout(()=>writeSnapshot(action,record),0);return out};wrapped.__tcCloudWrapped=true;window.save=wrapped}
 function wireProject(){const sel=document.getElementById('projectSelect');if(sel&&!sel.dataset.tcCloud){sel.dataset.tcCloud='1';sel.addEventListener('change',()=>setTimeout(()=>loadSnapshot(true),250))}}
 function init(){wrapSave();wireProject();const app=document.getElementById('app');if(app&&!app.classList.contains('hidden'))loadSnapshot();}
 new MutationObserver(init).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});addEventListener('DOMContentLoaded',init);setTimeout(init,900);setTimeout(()=>loadSnapshot(),1600)
})();