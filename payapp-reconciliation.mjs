// TotalConnect payment application validation; pure function, no side effects.
// Inputs must be sourced from canonical project/payapp records, not PDF text.
export function validatePayApplication(data, tolerance=0.01) {
  const issues=[];
  const money=(v,k)=>{const n=Number(v);if(v===null||v===undefined||v===""||!Number.isFinite(n)){issues.push({field:k,code:"MISSING_OR_INVALID",message:k+" must be a valid amount"});return NaN;}return Math.round((n+Number.EPSILON)*100)/100};
  const close=(actual,expected,field)=>{if(Number.isFinite(actual)&&Number.isFinite(expected)&&Math.abs(actual-expected)>tolerance)issues.push({field,code:"RECONCILIATION_MISMATCH",actual,expected:Math.round(expected*100)/100})};
  const original=money(data.originalContract,"originalContract");
  const changes=money(data.approvedChanges,"approvedChanges");
  const current=money(data.currentContract,"currentContract");
  const earned=money(data.workCompletedToDate,"workCompletedToDate");
  const retainage=money(data.retainageWithheld,"retainageWithheld");
  const net=money(data.earnedLessRetainage,"earnedLessRetainage");
  const prior=money(data.priorPayments,"priorPayments");
  const due=money(data.currentPaymentDue,"currentPaymentDue");
  const balance=money(data.balanceToFinishIncludingRetainage,"balanceToFinishIncludingRetainage");
  close(current,original+changes,"currentContract");
  close(net,earned-retainage,"earnedLessRetainage");
  close(due,net-prior,"currentPaymentDue");
  close(balance,current-net,"balanceToFinishIncludingRetainage");
  if(retainage<0||retainage>earned)issues.push({field:"retainageWithheld",code:"INVALID_RETAINAGE"});
  if(prior<0||prior>net)issues.push({field:"priorPayments",code:"INVALID_PRIOR_PAYMENTS"});
  if(data.priorPaymentsFundingSource==="owner_funds"&&data.lenderAdvancesToDate>0&&data.priorPayments===data.lenderAdvancesToDate)issues.push({field:"priorPaymentsFundingSource",code:"VERIFY_FUNDING_SOURCE",message:"Owner-paid amounts must not be misrepresented as lender advances"});
  if(Array.isArray(data.sovRows)&&data.sovRows.length){
    const sum=(key)=>data.sovRows.reduce((a,r)=>a+Number(r[key]||0),0);
    close(current,sum("scheduledValue"),"sovRows.scheduledValue");
    close(earned,sum("completedToDate"),"sovRows.completedToDate");
    close(retainage,sum("retainage"),"sovRows.retainage");
  } else issues.push({field:"sovRows",code:"SOV_NOT_VERIFIED",message:"Continuation sheet line items must be checked before signing"});
  return {valid:issues.length===0,issues,computed:{currentContract:original+changes,earnedLessRetainage:earned-retainage,currentPaymentDue:net-prior,balanceToFinishIncludingRetainage:current-net}};
}
