// TotalConnect payment application validation; pure function, no side effects.
// Inputs must be sourced from canonical project/payapp records, not PDF text.
export function validatePayApplication(data, tolerance=0.01) {
  const issues=[];
  if(!data||typeof data!=="object"||Array.isArray(data))return {valid:false,issues:[{field:"data",code:"INVALID_PAYAPP"}],computed:{}};
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
  if(original<0||current<0||earned<0||net<0||due<0||balance<0)issues.push({field:"amounts",code:"NEGATIVE_FINANCIAL_TOTAL"});
  if(earned>current+tolerance)issues.push({field:"workCompletedToDate",code:"OVERBILLED_CONTRACT"});
  if(retainage<0||retainage>earned)issues.push({field:"retainageWithheld",code:"INVALID_RETAINAGE"});
  if(prior<0||prior>net)issues.push({field:"priorPayments",code:"INVALID_PRIOR_PAYMENTS"});
  if(data.priorPaymentsFundingSource==="owner_funds"&&data.lenderAdvancesToDate>0&&data.priorPayments===data.lenderAdvancesToDate)issues.push({field:"priorPaymentsFundingSource",code:"VERIFY_FUNDING_SOURCE",message:"Owner-paid amounts must not be misrepresented as lender advances"});
  if(Array.isArray(data.sovRows)&&data.sovRows.length){
    for(const [i,row] of data.sovRows.entries()){
      for(const field of ["scheduledValue","completedToDate","retainage"]){
        const value=row?.[field];
        if(value===undefined||value===null||value===""||!Number.isFinite(Number(value))||Number(value)<0)issues.push({field:`sovRows[${i}].${field}`,code:"INVALID_SOV_AMOUNT"});
      }
      if(Number(row?.completedToDate)>Number(row?.scheduledValue)+tolerance)issues.push({field:`sovRows[${i}].completedToDate`,code:"SOV_OVERBILLING"});
      if(Number(row?.retainage)>Number(row?.completedToDate)+tolerance)issues.push({field:`sovRows[${i}].retainage`,code:"SOV_RETAINAGE_EXCEEDS_EARNED"});
    }
    const sum=(key)=>data.sovRows.reduce((a,r)=>a+Number(r[key]||0),0);
    close(current,sum("scheduledValue"),"sovRows.scheduledValue");
    close(earned,sum("completedToDate"),"sovRows.completedToDate");
    close(retainage,sum("retainage"),"sovRows.retainage");
  } else issues.push({field:"sovRows",code:"SOV_NOT_VERIFIED",message:"Continuation sheet line items must be checked before signing"});
  return {valid:issues.length===0,issues,computed:{currentContract:original+changes,earnedLessRetainage:earned-retainage,currentPaymentDue:net-prior,balanceToFinishIncludingRetainage:current-net}};
}
