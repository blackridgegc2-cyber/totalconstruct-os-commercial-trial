/* TotalConstruct original-layout PDF generation adapter.
   Uses an authorized original-layout PDF template and pdf-lib (window.PDFLib).
   Do not call this a signed document; signatures require the authenticated workflow.
*/
(function(){
'use strict';
const money=n=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
function validate(pa){
 const errors=[],near=(a,b)=>Math.abs(Number(a)-Number(b))<.011;
 const original=Number(pa.originalContract),co=Number(pa.approvedChanges),construction=original+co;
 const precon=Number(pa.separatelyAuthorizedPrecon||0),basis=construction+precon;
 if(!near(pa.contractValue,construction))errors.push('Construction contract does not equal original plus approved change orders.');
 if(!near(pa.combinedSovBasis,basis))errors.push('Combined SOV must equal construction contract plus separately authorized preconstruction.');
 if(!near(pa.earnedLessRetainage,Number(pa.grossCompleted)-Number(pa.currentRetainage)))errors.push('Earned less retainage mismatch.');
 if(!near(pa.currentPaymentDue,Number(pa.earnedLessRetainage)-Number(pa.priorPayments)))errors.push('Current payment due mismatch.');
 if(!Array.isArray(pa.rows)||!pa.rows.length)errors.push('Detailed continuation sheet has not been imported and reconciled.');
 else {
  const scheduled=pa.rows.reduce((s,r)=>s+Number(r.scheduledValue||0),0);
  if(!near(scheduled,basis))errors.push('SOV scheduled value does not equal combined billing basis.');
 }
 return {valid:!errors.length,errors,construction,basis};
}
async function renderOriginalLayout({templateBytes,payapp,fieldMap}){
 if(!window.PDFLib)throw Error('PDF rendering library not loaded');
 const check=validate(payapp);if(!check.valid)throw Error('Cannot generate: '+check.errors.join(' '));
 const doc=await window.PDFLib.PDFDocument.load(templateBytes);
 const font=await doc.embedFont(window.PDFLib.StandardFonts.Helvetica);
 // The field map must be approved against original PDF positions and contains
 // page (zero based), x/y from bottom-left, font size and optional opaque mask.
 for(const [key,position] of Object.entries(fieldMap||{})){
  const page=doc.getPages()[position.page];if(!page)throw Error('Invalid page mapping: '+key);
  const raw=payapp[key],value=position.money?money(raw):String(raw??'');
  if(position.mask){page.drawRectangle({x:position.x,y:position.y-2,width:position.mask.width,height:position.mask.height,color:window.PDFLib.rgb(1,1,1)})}
  page.drawText(value,{x:position.x,y:position.y,size:position.size||9,font,color:window.PDFLib.rgb(0,0,0),maxWidth:position.width||300});
 }
 return doc.save();
}
window.tcPayappPdf={validate,renderOriginalLayout};
})();