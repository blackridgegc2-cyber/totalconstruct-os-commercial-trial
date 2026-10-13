/* TotalConstruct integrated financial controls: deterministic, side-effect-free calculations.
   Amounts are integer cents. This module does not authorize approvals or write records. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.tcFinancialControls=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const cents=value=>{const n=Number(value);if(!Number.isFinite(n))throw Error('Invalid monetary amount');return Math.round((n+Number.EPSILON)*100)};
  const dollars=value=>Math.round(value)/100;
  const nonnegative=(v,label)=>{const n=cents(v);if(n<0)throw Error(label+' cannot be negative');return n};
  const sum=(items,field)=>items.reduce((total,item)=>total+nonnegative(item[field]??0,field),0);
  function commitment({original=0,approvedChanges=[]}={}){
    const base=nonnegative(original,'original');
    const changes=approvedChanges.reduce((total,c)=>total+cents(c.amount??0),0);
    if(base+changes<0)throw Error('Revised commitment cannot be negative');
    return {original:dollars(base),approvedChanges:dollars(changes),revised:dollars(base+changes)};
  }
  function validateSov(lines,revisedCommitment){
    if(!Array.isArray(lines))throw Error('SOV lines must be an array');
    const seen=new Set();
    for(const line of lines){
      const key=String(line.line_no??'').trim();
      if(!key||seen.has(key))throw Error('SOV line numbers must be unique and present');
      seen.add(key);
    }
    const total=sum(lines,'scheduled_value'),revised=nonnegative(revisedCommitment,'revised commitment');
    return {total:dollars(total),revised:dollars(revised),variance:dollars(total-revised),balanced:total===revised};
  }
  function billing(lines){
    if(!Array.isArray(lines))throw Error('Billing lines must be an array');
    let scheduled=0,prior=0,current=0,stored=0,retainage=0;
    for(const line of lines){
      const value=nonnegative(line.scheduled_value,'scheduled value');
      const before=nonnegative(line.prior_completed,'prior completed');
      const now=nonnegative(line.current_completed,'current completed');
      const materials=nonnegative(line.stored_materials,'stored materials');
      const rate=Number(line.retainage_percent??0);
      if(!Number.isFinite(rate)||rate<0||rate>100)throw Error('Retainage must be between 0 and 100 percent');
      if(before+now+materials>value)throw Error('Overbilling on SOV line '+String(line.line_no??''));
      scheduled+=value;prior+=before;current+=now;stored+=materials;
      retainage+=Math.round((before+now+materials)*rate/100);
    }
    const earned=prior+current+stored;
    return {scheduled:dollars(scheduled),priorCompleted:dollars(prior),currentCompleted:dollars(current),storedMaterials:dollars(stored),grossCompleted:dollars(earned),retainage:dollars(retainage),earnedLessRetainage:dollars(earned-retainage),balanceToFinish:dollars(scheduled-earned)};
  }
  function application(lines,previousCertified=0){
    const totals=billing(lines),paid=nonnegative(previousCertified,'previous certificates');
    const due=cents(totals.earnedLessRetainage)-paid;
    if(due<0)throw Error('Previous certificates exceed earned less retainage');
    return {...totals,previousCertificates:dollars(paid),currentPaymentDue:dollars(due)};
  }
  function transition(status,action,role){
    const allowed={
      draft:{submit:['contractor']},
      contractor_signed:{send_owner:['contractor']},
      owner_review:{approve:['owner'],return:['owner']},
      owner_approved:{send_lender:['owner']},
      lender_review:{approve:['lender'],return:['lender']},
      lender_approved:{generate_invoice:['contractor','accounting']},
      returned:{revise:['contractor']}
    };
    const next={
      'draft:submit':'contractor_signed',
      'contractor_signed:send_owner':'owner_review',
      'owner_review:approve':'owner_approved',
      'owner_review:return':'returned',
      'owner_approved:send_lender':'lender_review',
      'lender_review:approve':'lender_approved',
      'lender_review:return':'returned',
      'lender_approved:generate_invoice':'invoiced',
      'returned:revise':'draft'
    };
    const permitted=allowed[status]?.[action]||[];
    if(!permitted.includes(role))throw Error('Workflow transition not permitted');
    return next[status+':'+action];
  }
  return Object.freeze({commitment,validateSov,billing,application,transition});
});
