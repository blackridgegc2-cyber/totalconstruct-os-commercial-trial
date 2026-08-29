(()=>{
  'use strict';
  const KEY='platformFeedback';
  const now=()=>new Date().toISOString();
  const uid=()=>`FB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const build=()=>window.__TC_SUPABASE__?.buildSha||'local';
  const get=()=>Array.isArray(window.state?.[KEY])?window.state[KEY]:[];
  const persist=()=>{try{window.save?.();}catch(e){console.warn('Feedback save failed',e)}};
  const severity=(type,text)=>{
    const s=(text||'').toLowerCase();
    if(/security|data loss|corrupt|wrong total|wrong balance|permission|unauthorized|cannot login|can't login|crash|blank screen/.test(s)) return 'Critical';
    if(type==='Bug / Deficiency' && /cannot|can't|broken|fails|error|missing/.test(s)) return 'High';
    return type==='Bug / Deficiency'?'Normal':'Backlog';
  };
  const disposition=(sev)=>sev==='Critical'?'Immediate AI/Release Review':sev==='High'?'Priority Review':'Quarterly AI Review';
  function submit(input={}){
    if(!window.state) return null;
    const description=String(input.description||'').trim();
    if(description.length<5) throw new Error('Please describe the issue or suggestion.');
    const type=input.type||'Suggested Change';
    const sev=severity(type,description);
    const rec={
      id:uid(),type,description,title:String(input.title||'').trim()||description.slice(0,80),
      module:input.module||window.state?.activePage||window.state?.page||'Unknown',
      projectId:window.state?.selectedProject||window.state?.currentProject||null,
      userRole:window.state?.currentUser?.role||window.state?.role||'Unknown',
      buildSha:build(),createdAt:now(),updatedAt:now(),status:'Received',severity:sev,
      reviewCadence:disposition(sev),duplicateOf:null,demandCount:1,aiAssessment:'Pending',
      device:navigator.userAgent||'',attachments:Array.isArray(input.attachments)?input.attachments:[]
    };
    const existing=get().find(x=>x.status!=='Released' && x.type===rec.type && x.module===rec.module && String(x.description||'').toLowerCase()===description.toLowerCase());
    if(existing){existing.demandCount=(existing.demandCount||1)+1;existing.updatedAt=now();persist();return existing;}
    window.state[KEY]=[...get(),rec];persist();return rec;
  }
  function update(id,patch={}){const r=get().find(x=>x.id===id);if(!r)return null;Object.assign(r,patch,{updatedAt:now()});persist();return r;}
  function quarterlyReview(){
    const backlog=get().filter(x=>['Backlog','Received','AI Reviewing','Under Consideration'].includes(x.status) && x.severity!=='Critical');
    return backlog.sort((a,b)=>(b.demandCount||1)-(a.demandCount||1)).map(x=>({id:x.id,title:x.title,type:x.type,module:x.module,demand:x.demandCount||1,severity:x.severity,status:x.status,buildSha:x.buildSha}));
  }
  window.tcFeedbackCenter={submit,update,list:get,quarterlyReview,severity};
  const oldSave=window.save;
  if(window.state && !Array.isArray(window.state[KEY])) window.state[KEY]=[];
  // Expose a lightweight entry point other UI modules can call from Help or any major screen.
  window.tcReportProblem=(description,module)=>submit({type:'Bug / Deficiency',description,module});
  window.tcSuggestImprovement=(description,module)=>submit({type:'Suggested Change',description,module});
})();
