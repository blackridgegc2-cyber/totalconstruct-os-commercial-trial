const assert=require('node:assert/strict');
const test=require('node:test');
const f=require('../r1-integrated-financial-controls.js');
test('commitment changes include credits',()=>assert.deepEqual(f.commitment({original:1000,approvedChanges:[{amount:150},{amount:-50}]}),{original:1000,approvedChanges:100,revised:1100}));
test('SOV reconciliation blocks variance',()=>{assert.equal(f.validateSov([{line_no:1,scheduled_value:100}],100).balanced,true);assert.equal(f.validateSov([{line_no:1,scheduled_value:90}],100).balanced,false)});
test('billing carry forward and retainage',()=>{const r=f.application([{line_no:1,scheduled_value:1000,prior_completed:200,current_completed:300,stored_materials:100,retainage_percent:10}],180);assert.equal(r.grossCompleted,600);assert.equal(r.retainage,60);assert.equal(r.currentPaymentDue,360)});
test('overbilling rejected',()=>assert.throws(()=>f.billing([{line_no:1,scheduled_value:100,prior_completed:70,current_completed:40}]),/Overbilling/));
test('role and sequence gate',()=>{assert.equal(f.transition('owner_review','approve','owner'),'owner_approved');assert.throws(()=>f.transition('owner_review','approve','lender'),/not permitted/)});
