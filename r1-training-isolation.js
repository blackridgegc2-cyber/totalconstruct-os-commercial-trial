(()=>{
  function isTrainingProject(p){
    if(!p)return false;
    if(p.isTraining===true||p.is_training===true)return true;
    const id=String(p.id||'').toLowerCase();
    const job=String(p.job||p.job_number||'').toLowerCase();
    const name=String(p.name||'').trim().toLowerCase();
    return id==='training'||id.startsWith('training-')||job.startsWith('sample-')||job.startsWith('training-')||name==='training project'||name.includes('training project')||name.includes('totalconstruct training')||name.includes('training / sample')||name.includes('sample project');
  }
  window.tcIsTrainingProject=isTrainingProject;
  window.tcProductionProjects=()=>((state&&Array.isArray(state.projects))?state.projects:[]).filter(p=>!isTrainingProject(p));

  function withProductionProjects(fn){
    return function(...args){
      if(!state||!Array.isArray(state.projects))return fn.apply(this,args);
      const all=state.projects;
      state.projects=all.filter(p=>!isTrainingProject(p));
      try{return fn.apply(this,args)}finally{state.projects=all}
    };
  }

  // Company / portfolio views must never count the permanent Training Center as production work.
  // Training remains selectable for training and role testing, but is excluded from executive
  // dashboards, opportunity/portfolio boards, WIP, OH recovery, fee reporting and resource rollups.
  ['renderHome','renderBoard','renderWip','renderOH','renderFees','renderResources'].forEach(name=>{
    try{
      if(typeof window[name]==='function'&&!window[name].__tcTrainingIsolated){
        const wrapped=withProductionProjects(window[name]);
        wrapped.__tcTrainingIsolated=true;
        window[name]=wrapped;
      }
    }catch(e){console.warn('Training isolation',name,e)}
  });

  // Remove the legacy trial label after isolation is active so the dashboard accurately reflects totals.
  try{
    const home=document.getElementById('home');
    if(home){
      const sub=home.querySelector('.sub');
      if(sub&&sub.textContent.includes('Training Project included'))sub.textContent=sub.textContent.replace(/\s*·\s*Training Project included/g,' · Training excluded from company totals');
    }
  }catch(e){console.warn('Training isolation label',e)}
})();
