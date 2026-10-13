import assert from "node:assert/strict";
import {validatePayApplication} from "./payapp-reconciliation.mjs";
const base={originalContract:747114,approvedChanges:38700,currentContract:785814,workCompletedToDate:45480,retainageWithheld:500,earnedLessRetainage:44980,priorPayments:20680,currentPaymentDue:24300,balanceToFinishIncludingRetainage:740834,sovRows:[{scheduledValue:785814,completedToDate:45480,retainage:500}]};
assert.equal(validatePayApplication(base).valid,true);
assert.equal(validatePayApplication({...base,currentPaymentDue:0}).valid,false);
assert.equal(validatePayApplication({...base,sovRows:[]}).valid,false);
assert.equal(validatePayApplication({...base,sovRows:[{scheduledValue:830814,completedToDate:45480,retainage:500}]}).valid,false);
console.log("Payapp reconciliation checks passed");
