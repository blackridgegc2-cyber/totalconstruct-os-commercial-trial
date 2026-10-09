'use strict';
// Deterministic cents-based pay application accounting. All amounts are integer cents.
// Prior stored materials are tracked as a subset of cumulative earned, not added twice.
const cents=(n,name='amount')=>{if(!Number.isSafeInteger(n))throw Error(name+' must be integer cents');return n};
const sum=(xs)=>xs.reduce((s,x)=>cents(s+cents(x)),0);
const amount=(obj,key)=>cents(obj[key]??0,key);
function checkLine(l){
 if(!l?.id||!l.agreementId)throw Error('Line ID and agreement are required');
 const scheduled=amount(l,'scheduledCents'),previous=amount(l,'previousCents'),current=amount(l,'currentCents');
 const stored=amount(l,'storedCents'),priorStored=amount(l,'priorStoredCents');
 const priorRetainage=amount(l,'priorRetainageCents'),newRetainage=amount(l,'retainageCents');
 if([scheduled,previous,current,stored,priorStored,priorRetainage].some(x=>x<0))throw Error('Negative amount on line '+l.id);
 if(previous+current+stored>scheduled)throw Error('Earned exceeds scheduled: '+l.id);
 if(priorStored>previous)throw Error('Previously stored exceeds prior earned: '+l.id);
 if(priorRetainage+newRetainage<0||priorRetainage+newRetainage>previous+current+stored)throw Error('Invalid retainage: '+l.id);
 return l;
}
function calculate(lines,{priorCertifiedNetCents=0}={}){
 if(!Array.isArray(lines)||!lines.length)throw Error('SOV lines required');
 lines.forEach(checkLine);
 const keys=['scheduledCents','previousCents','currentCents','storedCents','priorRetainageCents','retainageCents'];
 const totals=Object.fromEntries(keys.map(k=>[k,sum(lines.map(l=>amount(l,k)))]));
 const earned=cents(totals.previousCents+totals.currentCents+totals.storedCents);
 const net=cents(earned-totals.priorRetainageCents-totals.retainageCents);
 return {...totals,earnedCents:earned,certifiedNetCents:net,currentDueCents:cents(net-cents(priorCertifiedNetCents))};
}
function rollForward(prior){
 if(!['approved','finalized'].includes(prior?.status))throw Error('Only approved applications roll forward');
 if(!Number.isSafeInteger(prior.number)||prior.number<1)throw Error('Invalid application number');
 const computed=calculate(prior.lines);
 if(computed.certifiedNetCents!==cents(prior.certifiedNetCents))throw Error('Prior certified amount does not reconcile to SOV');
 const lines=prior.lines.map(l=>({
  ...l,
  previousCents:cents(amount(l,'previousCents')+amount(l,'currentCents')+amount(l,'storedCents')),
  currentCents:0,
  priorStoredCents:amount(l,'storedCents'),
  storedCents:0,
  priorRetainageCents:cents(amount(l,'priorRetainageCents')+amount(l,'retainageCents')),
  retainageCents:0
 }));
 const next={number:prior.number+1,status:'draft',priorApplicationId:prior.id,lines,
  changes:[],transfers:[],priorCertifiedNetCents:computed.certifiedNetCents,
  actualPaymentsReceivedCents:amount(prior,'actualPaymentsReceivedCents')};
 if(calculate(lines,{priorCertifiedNetCents:next.priorCertifiedNetCents}).currentDueCents!==0)throw Error('Roll-forward changed the payable balance');
 return next;
}
function transfer(lines,{fromId,toId,amountCents,reason,authorizationId}){
 cents(amountCents);
 if(amountCents<=0||fromId===toId||!reason?.trim()||!authorizationId)throw Error('Authorized transfer and reason required');
 const next=lines.map(l=>({...l}));next.forEach(checkLine);
 const from=next.find(l=>l.id===fromId),to=next.find(l=>l.id===toId);
 if(!from||!to||from.agreementId!==to.agreementId)throw Error('Transfer must stay within agreement');
 if(amount(from,'scheduledCents')-amountCents<amount(from,'previousCents')+amount(from,'currentCents')+amount(from,'storedCents'))throw Error('Cannot transfer already earned value');
 const before=calculate(next);
 from.scheduledCents-=amountCents;to.scheduledCents+=amountCents;
 const after=calculate(next,{priorCertifiedNetCents:0});
 if(after.scheduledCents!==before.scheduledCents||after.earnedCents!==before.earnedCents||after.certifiedNetCents!==before.certifiedNetCents)throw Error('Transfer changed project financial totals');
 return next;
}
function applyChange(lines,{changeId,agreementId,lineId,amountCents,description,authorizationId,approved}){
 if(!approved||!authorizationId||!changeId||!description?.trim())throw Error('Approved and evidenced change required');
 cents(amountCents);
 if(!amountCents)throw Error('Zero-value change');
 const next=lines.map(l=>({...l}));next.forEach(checkLine);
 const line=next.find(l=>l.id===lineId&&l.agreementId===agreementId);
 if(!line)throw Error('Change line or agreement missing');
 if((line.appliedChangeIds||[]).includes(changeId))throw Error('Duplicate change order');
 line.scheduledCents=cents(line.scheduledCents+amountCents);
 line.appliedChangeIds=[...(line.appliedChangeIds||[]),changeId];
 checkLine(line);return next;
}
module.exports={calculate,rollForward,transfer,applyChange,checkLine};
