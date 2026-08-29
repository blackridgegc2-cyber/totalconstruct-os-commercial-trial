(()=>{
  function isTrainingProject(p){
    if(!p)return false;
    if(p.isTraining===true||p.is_training===true)return true;
    const id=String(p.id||'').toLowerCase();
    const job=String(p.job||p.job_number||'').toLowerCase();
    const name=String(p.name||'').toLowerCase();
    return id==='training'||job.startsWith('sample-')||name.includes('totalconstruct training')||name.includes('training / sample');
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

  // These are company/portfolio financial reports. Training remains available in the
  // project selector and project modules, but is removed while company totals render.
  ['renderWip','renderOH','renderFees'].forEach(name=>{
    try{
      if(typeof window[name]==='function'&&!window[name].__tcTrainingIsolated){
        const wrapped=withProductionProjects(window[name]);
        wrapped.__tcTrainingIsolated=true;
        window[name]=wrapped;
      }
    }catch(e){console.warn('Training isolation',name,e)}
  });
})();
