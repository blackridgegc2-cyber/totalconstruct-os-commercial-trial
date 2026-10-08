'use strict';
// Pure cents-based SOV accounting. No browser state, IO or approval side effects.
const assertCents=n=>{if(!Number.isSafeInteger(n))throw Error('Amounts must be integer cents');return n;};
const sum=a=>a.reduce((s,n)=>s+assertCents(n),0);
function rollForward(prior) {
 if(!['approved','finalized'].includes(prior.status))throw Error('Only approved applications roll forward');
 if(!Array.isArray(prior.lines)||!prior.lines.length)throw Error('Missing SOV');
 return {number:prior.number+1,status:'draft',priorApplicationId:prior.id,
  lines:prior.lines.map(l=>({...l,previousCents:assertCents(l.previousCents)+assertCents(l.currentCents),currentCents:0,
   priorStoredCents:assertCents(l.storedCents||0),storedCents:0,
   priorRetainageCents:assertCents(l.retainageCents||0),retainageCents:0})),
  changes:[],transfers:[],priorCertifiedNetCents:assertCents(prior.certifiedNetCents),
  actualPaymentsReceivedCents:assertCents(prior.actualPaymentsReceivedCents||0)};
}
function transfer(lines,{fromId,toId,amountCents,reason,authorizationId}) {
 assertCents(amountCents);
 if(amountCents<=0||fromId===toId||!reason?.trim()||!authorizationId)throw Error('Invalid authorized transfer');
 const next=lines.map(l=>({...l})),from=next.find(l=>l.id===fromId),to=next.find(l=>l.id===toId);
 if(!from||!to||from.agreementId!==to.agreementId)throw Error('Transfer must stay within agreement');
 if(from.scheduledCents<amountCents)throw Error('Insufficient source allocation');
 if(from.scheduledCents-amountCents<from.previousCents+from.currentCents)throw Error('Cannot transfer already earned value');
 const before=sum(next.map(l=>l.scheduledCents));
 from.scheduledCents-=amountCents;to.scheduledCents+=amountCents;
 if(sum(next.map(l=>l.scheduledCents))!==before)throw Error('Unbalanced transfer');
 return next;
}
function calculate(lines,{priorCertifiedNetCents=0}={}) {
 const totals={scheduledCents:0,previousCents:0,currentCents:0,storedCents:0,retainageCents:0};
 for(const l of lines) {
  for(const k of Object.keys(totals))totals[k]+=assertCents(l[k]||0);
  if(l.previousCents+l.currentCents+(l.storedCents||0)>l.scheduledCents)throw Error('Earned exceeds scheduled: '+l.id);
 }
 const earned=totals.previousCents+totals.currentCents+totals.storedCents;
 const net=earned-totals.retainageCents;
 return {...totals,earnedCents:earned,certifiedNetCents:net,currentDueCents:net-assertCents(priorCertifiedNetCents)};
}
if(typeof module!=='undefined')module.exports={rollForward,transfer,calculate};
