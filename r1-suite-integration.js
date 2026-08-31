(()=>{
  'use strict';
  const PRODUCT='totalconstruct-commercial';
  const VERSION='1.0';
  const KEY='integrationOutbox';
  const now=()=>new Date().toISOString();
  const uuid=()=>globalThis.crypto?.randomUUID?.()||`tc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
  const project=()=>{try{return typeof window.currentProject==='function'?window.currentProject():null}catch(e){return null}};
  const user=()=>window.currentUser||null;
  const state=()=>window.state||null;
  const outbox=()=>{const s=state();if(!s)return[];if(!Array.isArray(s[KEY]))s[KEY]=[];return s[KEY]};
  const clean=v=>v==null?null:String(v).trim()||null;

  function context(){
    const p=project(),u=user(),s=state();
    return {
      product:PRODUCT,
      contractVersion:VERSION,
      companyId:clean(u?.companyId||s?.companyId||s?.company?.id),
      projectId:clean(p?.id),
      projectNumber:clean(p?.job||p?.jobNumber),
      userId:clean(u?.id),
      userRole:clean(u?.role),
      buildSha:clean(window.__TC_SUPABASE__?.buildSha)||'local'
    };
  }

  function envelope(eventType,payload={},targetProduct=null){
    if(!eventType)throw new Error('Integration event type is required.');
    return {
      id:uuid(),
      eventType:String(eventType),
      sourceProduct:PRODUCT,
      targetProduct:clean(targetProduct),
      contractVersion:VERSION,
      occurredAt:now(),
      context:context(),
      payload:payload&&typeof payload==='object'?payload:{value:payload},
      status:'Pending',
      attempts:0,
      lastAttemptAt:null,
      deliveredAt:null,
      error:null
    };
  }

  function enqueue(eventType,payload={},targetProduct=null){
    const rec=envelope(eventType,payload,targetProduct);
    outbox().push(rec);
    try{window.save?.('Queued suite integration event',rec.eventType)}catch(e){console.warn('Integration outbox save failed',e)}
    return rec;
  }

  function markDelivered(id){const r=outbox().find(x=>x.id===id);if(!r)return null;r.status='Delivered';r.deliveredAt=now();r.error=null;try{window.save?.('Completed suite integration event',r.eventType)}catch(e){}return r}
  function markFailed(id,error){const r=outbox().find(x=>x.id===id);if(!r)return null;r.status='Failed';r.attempts=(r.attempts||0)+1;r.lastAttemptAt=now();r.error=String(error?.message||error||'Unknown integration error');try{window.save?.('Updated suite integration event',r.eventType)}catch(e){}return r}
  function pending(){return outbox().filter(x=>x.status!=='Delivered')}

  const capabilities=Object.freeze({
    leadGenerator:['opportunity.created','opportunity.updated','opportunity.converted_to_project'],
    scheduling:['employee.assignment','labor.plan','time.actual','pto.status'],
    payroll:['payroll.actual_cost','payroll.burden','reimbursement.actual','benefit_cost.actual'],
    totalConstruct:['project.created','project.updated','cost_code.created','employee.assignment','labor.actual_cost']
  });

  const init=()=>{
    const s=state();if(s&&!Array.isArray(s[KEY]))s[KEY]=[];
    if(window.tcCloud?.companyTracked&&!window.tcCloud.companyTracked.includes(KEY))window.tcCloud.companyTracked.push(KEY);
  };

  window.tcSuiteIntegration={product:PRODUCT,contractVersion:VERSION,capabilities,context,envelope,enqueue,pending,markDelivered,markFailed};
  addEventListener('DOMContentLoaded',init);setTimeout(init,900);
})();
