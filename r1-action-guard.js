(()=>{
 const need={
  addRfi:['rfi'],addSub:['submittal'],tcAddMeeting:['meetings'],tcAddDaily:['daily'],tcAddTask:['tasks'],
  addProject:['all']
 };
 function perms(){return currentUser?.permissions||[]}
 function can(req){const p=perms();return p.includes('all')||(req||[]).some(x=>p.includes(x))}
 function deny(){alert('Your role does not have permission to perform this action.');return false}
 function wrap(name,req){const fn=window[name];if(typeof fn!=='function'||fn.__tcPermissionWrapped)return;const w=function(){if(!can(req))return deny();return fn.apply(this,arguments)};w.__tcPermissionWrapped=true;w.__tcOriginal=fn;window[name]=w}
 function install(){for(const [name,req] of Object.entries(need))wrap(name,req)}
 new MutationObserver(install).observe(document.documentElement,{subtree:true,childList:true});addEventListener('DOMContentLoaded',()=>setTimeout(install,700));setInterval(install,2500);window.tcActionGuard={can,install};
})();