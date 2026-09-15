(()=>{
  function isTrainingProject(p){
    if(!p)return false;
    if(p.isTraining===true||p.is_training===true)return true;
    const id=String(p.id||'').toLowerCase();
    const job=String(p.job||p.job_number||'').toLowerCase();
    const name=String(p.name||'').trim().toLowerCase();
    return id==='training'||id.startsWith('training-')||job.startsWith('sample-')||job.startsWith('training-')||job.startsWith('trn-')||name==='training project'||name.includes('training project')||name.includes('totalconstruct training')||name.includes('training / sample')||name.includes('sample project');
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

  function isolate(name){
    try{
      const fn=window[name];
      if(typeof fn!=='function'||fn.__tcTrainingIsolated)return false;
      const wrapped=withProductionProjects(fn);
      wrapped.__tcTrainingIsolated=true;
      wrapped.__tcTrainingOriginal=fn;
      window[name]=wrapped;
      return true;
    }catch(e){console.warn('Training isolation',name,e);return false}
  }

  const companyViews=['renderHome','renderBoard','renderWip','renderOH','renderFees','renderResources'];
  function install(){companyViews.forEach(isolate)}
  install();
  setTimeout(install,0);
  setTimeout(install,500);
  setTimeout(install,1500);
  setInterval(install,3000);

  try{
    const home=document.getElementById('home');
    if(home){
      const sub=home.querySelector('.sub');
      if(sub&&sub.textContent.includes('Training Project included'))sub.textContent=sub.textContent.replace(/\s*·\s*Training Project included/g,' · Training excluded from company totals');
    }
  }catch(e){console.warn('Training isolation label',e)}
})();
