(()=>{
  if(typeof window.renderPage!=='function'||typeof window.tcIsTrainingProject!=='function')return;
  const prior=window.renderPage;
  window.renderPage=function(id,...args){
    const companyFinance=['companyhealth','controller','capitalplan'];
    if(!companyFinance.includes(id)||!state||!Array.isArray(state.projects))return prior.call(this,id,...args);
    const all=state.projects;
    state.projects=all.filter(p=>!window.tcIsTrainingProject(p));
    try{return prior.call(this,id,...args)}finally{state.projects=all}
  };
})();
