'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {rollForward,transfer,calculate,applyChange}=require('../r1-payapp-accounting-core.cjs');
const prior=()=>({id:'pa1',number:1,status:'approved',certifiedNetCents:4498000,actualPaymentsReceivedCents:2068000,lines:[
 {id:'allowance',agreementId:'construction',scheduledCents:10000000,previousCents:0,currentCents:0,storedCents:0,retainageCents:0},
 {id:'electrical',agreementId:'construction',scheduledCents:15000000,previousCents:2068000,currentCents:2480000,storedCents:0,retainageCents:50000}
]});
test('approved application rolls certified cumulative work and retainage without creating new payment',()=>{
 const next=rollForward(prior());assert.equal(next.number,2);assert.equal(next.lines[1].previousCents,4548000);
 assert.equal(next.lines[1].currentCents,0);assert.equal(next.lines[1].priorRetainageCents,50000);
 assert.equal(next.actualPaymentsReceivedCents,2068000);assert.equal(next.priorCertifiedNetCents,4498000);
 assert.equal(calculate(next.lines,{priorCertifiedNetCents:next.priorCertifiedNetCents}).currentDueCents,0);
});
test('rejects unapproved and inconsistent certified application',()=>{
 assert.throws(()=>rollForward({...prior(),status:'draft'}));
 assert.throws(()=>rollForward({...prior(),certifiedNetCents:4500000}),/reconcile/);
});
test('GMP category transfer is zero-sum, leaves billing unchanged and requires approval',()=>{
 const next=rollForward(prior()),before=calculate(next.lines);
 const after=transfer(next.lines,{fromId:'allowance',toId:'electrical',amountCents:2000000,reason:'GMP subcontract buyout',authorizationId:'approval-1'});
 assert.equal(calculate(after).scheduledCents,before.scheduledCents);
 assert.equal(calculate(after).earnedCents,before.earnedCents);
 assert.equal(after[0].scheduledCents,8000000);assert.equal(after[1].scheduledCents,17000000);
 assert.throws(()=>transfer(next.lines,{fromId:'allowance',toId:'electrical',amountCents:1,reason:'',authorizationId:'approval'}));
});
test('cannot transfer earned dollars or between agreements',()=>{
 const next=rollForward(prior());
 assert.throws(()=>transfer(next.lines,{fromId:'electrical',toId:'allowance',amountCents:12000000,reason:'reallocate',authorizationId:'a'}));
 assert.throws(()=>transfer([...next.lines,{id:'design',agreementId:'precon',scheduledCents:100000,previousCents:0,currentCents:0}],{fromId:'allowance',toId:'design',amountCents:10000,reason:'cross',authorizationId:'a'}));
});
test('stored materials are carried as earned only once',()=>{
 const p=prior();p.lines[1].storedCents=100000;p.certifiedNetCents=4598000;
 const n=rollForward(p);assert.equal(n.lines[1].previousCents,4648000);
 assert.equal(n.lines[1].storedCents,0);assert.equal(n.lines[1].priorStoredCents,100000);
 assert.equal(calculate(n.lines,{priorCertifiedNetCents:n.priorCertifiedNetCents}).currentDueCents,0);
});
test('approved changes update the correct agreement once, pending changes cannot post',()=>{
 const lines=rollForward(prior()).lines;
 const change={changeId:'co1',agreementId:'construction',lineId:'electrical',amountCents:3870000,description:'Additional scope',authorizationId:'owner-email',approved:true};
 const updated=applyChange(lines,change);assert.equal(updated[1].scheduledCents,18870000);
 assert.throws(()=>applyChange(updated,change),/Duplicate/);
 assert.throws(()=>applyChange(lines,{...change,approved:false}),/Approved/);
 assert.throws(()=>applyChange(lines,{...change,agreementId:'precon'}),/missing/);
});
test('negative retainage and overbilling fail closed',()=>{
 const p=prior();p.lines[1].currentCents=15000000;assert.throws(()=>calculate(p.lines),/Earned exceeds/);
 const q=prior();q.lines[1].retainageCents=-100;assert.throws(()=>calculate(q.lines),/Invalid retainage/);
});
