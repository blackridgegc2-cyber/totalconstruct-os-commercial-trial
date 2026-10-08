'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {rollForward,transfer,calculate}=require('../r1-payapp-accounting-core.cjs');
const prior={id:'pa1',number:1,status:'approved',certifiedNetCents:4498000,actualPaymentsReceivedCents:2068000,lines:[
 {id:'allowance',agreementId:'construction',scheduledCents:10000000,previousCents:0,currentCents:0,storedCents:0,retainageCents:0},
 {id:'electrical',agreementId:'construction',scheduledCents:15000000,previousCents:2068000,currentCents:2480000,storedCents:0,retainageCents:50000}
]};
test('approved app carries completed amounts, resets this period, and preserves cash separately',()=>{
 const next=rollForward(prior);assert.equal(next.number,2);assert.equal(next.lines[1].previousCents,4548000);
 assert.equal(next.lines[1].currentCents,0);assert.equal(next.actualPaymentsReceivedCents,2068000);
 assert.equal(next.priorCertifiedNetCents,4498000);
});
test('draft cannot roll forward',()=>assert.throws(()=>rollForward({...prior,status:'draft'})));
test('transfers conserve agreement value and never bill work',()=>{
 const next=rollForward(prior),before=calculate(next.lines);
 const after=transfer(next.lines,{fromId:'allowance',toId:'electrical',amountCents:2000000,reason:'GMP subcontract buyout',authorizationId:'approval-1'});
 assert.equal(calculate(after).scheduledCents,before.scheduledCents);
 assert.equal(calculate(after).earnedCents,before.earnedCents);
 assert.equal(after[0].scheduledCents,8000000);assert.equal(after[1].scheduledCents,17000000);
});
test('cannot move earned dollars or cross agreements',()=>{
 const next=rollForward(prior);
 assert.throws(()=>transfer(next.lines,{fromId:'electrical',toId:'allowance',amountCents:12000000,reason:'reallocate',authorizationId:'a'}));
 assert.throws(()=>transfer([...next.lines,{id:'design',agreementId:'precon',scheduledCents:100000,previousCents:0,currentCents:0}],{fromId:'allowance',toId:'design',amountCents:10000,reason:'cross',authorizationId:'a'}));
});
test('prior certification is not assumed paid',()=>{
 const next=rollForward(prior),calc=calculate(next.lines,{priorCertifiedNetCents:next.priorCertifiedNetCents});
 assert.equal(calc.currentDueCents,50000); // Prior $500 retainage remains; no new work billed.
});
