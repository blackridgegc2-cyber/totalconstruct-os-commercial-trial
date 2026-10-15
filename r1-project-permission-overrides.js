(()=>{
'use strict';
const cfg=window.__TC_SUPABASE__||{},maxAge=30000;
let loaded=null,pending=null,revision=0;
const project=()=>String((typeof currentProject==='function'?currentProject()?.id:null)||'');
const token=()=>window.tcAuth?.getAccessToken?.()||'';
const scope=()=>({projectId:project(),token:token()});
const same=(a,b)=>!!a&&!!b&&a.projectId===b.projectId&&a.token===b.token;
function clear(){loaded=null;window.tcProjectGrants={projectId:'',permissions:[]}}
function permissions(){
 const now=scope();
 if(!now.projectId||!now.token||!same(loaded,now)||Date.now()-loaded.at>=maxAge)return [];
 return loaded.permissions.slice();
}
async function refresh(force=false){
 const now=scope();
 if(!now.projectId||!now.token||!cfg.url||!cfg.key){revision++;pending=null;clear();window.tcSecurity?.guard?.();return}
 if(!force&&same(loaded,now)&&Date.now()-loaded.at<maxAge)return;
 if(!force&&same(pending,now))return;
 const request=++revision;pending=now;clear();window.tcSecurity?.guard?.();
 try{
  const r=await fetch(cfg.url.replace(/\/$/,'')+'/rest/v1/rpc/tc_my_project_permissions',{method:'POST',headers:{apikey:cfg.key,Authorization:'Bearer '+now.token,'Content-Type':'application/json'},body:JSON.stringify({p_project:now.projectId})});
  if(!r.ok)throw Error('Project permission request failed ('+r.status+')');
  const rows=await r.json();
  if(!Array.isArray(rows))throw Error('Invalid project permission response');
  const grants=rows.filter(x=>x?.enabled===true&&typeof x.permission==='string').map(x=>x.permission);
  if(request===revision&&same(now,scope())){
   loaded={...now,at:Date.now(),permissions:grants};
   window.tcProjectGrants={projectId:now.projectId,permissions:grants.slice()};
  }
 }catch(e){if(request===revision)clear();console.warn('Scoped permissions unavailable',e)}
 finally{if(request===revision){pending=null;window.tcSecurity?.guard?.();if(!same(now,scope()))queueMicrotask(()=>refresh())}}
}
window.tcProjectPermissions={permissions,refresh:()=>refresh(true),grant:async(userId,permission,enabled)=>{
 const now=scope();if(!now.projectId||!now.token)throw Error('Select a project and sign in');
 const r=await fetch(cfg.url.replace(/\/$/,'')+'/rest/v1/rpc/tc_set_project_permission',{method:'POST',headers:{apikey:cfg.key,Authorization:'Bearer '+now.token,'Content-Type':'application/json'},body:JSON.stringify({p_project:now.projectId,p_user:userId,p_permission:permission,p_enabled:!!enabled})});
 if(!r.ok)throw Error('Permission update rejected ('+r.status+')');
 await refresh(true);
}};
setInterval(()=>refresh(),2000);
addEventListener('tc:r1-ready',()=>refresh());addEventListener('DOMContentLoaded',()=>refresh());
})();
