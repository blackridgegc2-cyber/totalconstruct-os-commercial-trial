/* Native Blackridge form generation. Reconciled data only; no signatures or delivery. */
(function(root){
'use strict';
const cents=(v,label)=>{if(v===undefined||v===null||v===''||!Number.isFinite(Number(v)))throw Error(label+' is missing or invalid');return Math.round(Number(v)*100)};
const amount=v=>(v/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
function reconcile(pa){
 const original=cents(pa.originalContract,'Original contract'),changes=cents(pa.approvedChanges,'Approved changes'),precon=cents(pa.separatelyAuthorizedPrecon??0,'Separate preconstruction'),contract=original+changes,basis=contract+precon;
 if(original<0||precon<0||contract<0)throw Error('Contract values cannot be negative');
 if(!Array.isArray(pa.rows)||!pa.rows.length)throw Error('Complete the Schedule of Values for this application before generating its PDF');
 const rows=pa.rows.map((r,i)=>{
  const prefix='SOV line '+(i+1),scheduled=cents(r.scheduledValue??r.scheduled_value,prefix+' scheduled value'),co=cents(r.changes??r.approvedChanges??0,prefix+' changes'),orig=cents(r.originalValue??(scheduled-co)/100,prefix+' original value'),previous=cents(r.previous??r.priorCompleted??0,prefix+' previous work'),work=cents(r.thisPeriod??r.currentWork??0,prefix+' current work'),stored=cents(r.stored??0,prefix+' stored materials'),ret=cents(r.retainage??0,prefix+' retainage'),total=previous+work+stored;
  if(!String(r.description??r.name??'').trim())throw Error(prefix+' needs a description');
  if([scheduled,orig,previous,work,stored,ret].some(x=>x<0)||total>scheduled||ret>total||orig+co!==scheduled)throw Error(prefix+' amounts do not reconcile');
  return {item:String(r.item??r.itemNo??r.line_no??i+1),description:String(r.description??r.name),payee:String(r.payee??r.vendor??''),section:String(r.section??''),scheduled,co,orig,previous,work,stored,ret,total,balance:scheduled-total};
 });
 const sum=k=>rows.reduce((s,r)=>s+r[k],0),gross=sum('total'),ret=sum('ret'),net=gross-ret,prior=cents(pa.priorPayments??pa.previousOwnerFundedPayments,'Previous payments'),due=net-prior;
 if(sum('scheduled')!==basis||sum('orig')!==original+precon||sum('co')!==changes)throw Error('SOV original values and changes must reconcile to the construction contract plus separately authorized preconstruction');
 if(prior<0||due<0)throw Error('Previous payments exceed earned less retainage');
 if(cents(pa.unbilled??0,'Adjustment')!==0)throw Error('Allocate the manual adjustment to the SOV before PDF generation');
 for(const [key,value] of Object.entries({contractValue:contract,grossCompleted:gross,currentRetainage:ret,earnedLessRetainage:net,currentPaymentDue:due,priorCompleted:sum('previous'),currentWork:sum('work'),stored:sum('stored')}))if(cents(pa[key],key)!==value)throw Error('Saved '+key+' differs from the detailed SOV. Save the corrected draft first');
 if(!Number.isInteger(Number(pa.number))||Number(pa.number)<1||!/^\d{4}-\d{2}-\d{2}$/.test(pa.periodThrough||''))throw Error('Application number and period-through date are required');
 return {original,changes,precon,contract,basis,rows,gross,ret,net,prior,due,balance:contract-net,sum};
}
async function render({templateBytes,payapp:pa,project={},PDFLib=root.PDFLib}){
 if(!PDFLib)throw Error('PDF renderer unavailable');const v=reconcile(pa);
 const doc=await PDFLib.PDFDocument.load(templateBytes),font=await doc.embedFont(PDFLib.StandardFonts.Helvetica),bold=await doc.embedFont(PDFLib.StandardFonts.HelveticaBold),base=doc.getPages();
 const clean=s=>String(s??'').replace(/[\u2010-\u2015]/g,'-').replace(/[^\x20-\x7e\xa0-\xff]/g,'?');
 function text(page,value,x,top,width,size=7,strong=false,right=false){const f=strong?bold:font,s=clean(value);let fs=size;while(fs>3.5&&f.widthOfTextAtSize(s,fs)>width)fs-=.25;if(f.widthOfTextAtSize(s,fs)>width)throw Error('Text exceeds form field width: '+s.slice(0,40));page.drawText(s,{x:right?x+width-f.widthOfTextAtSize(s,fs):x,y:page.getHeight()-top-fs,size:fs,font:f,color:PDFLib.rgb(0,0,0)})}
 const t=(i,s,x,y,w=150,size=7,strong=false,right=false)=>text(base[i],s,x,y,w,size,strong,right),m=(i,n,x,y,w=80,size=7)=>t(i,amount(n),x,y,w,size,false,true);
 const projectName=project.name||pa.project||'',address=project.address||'',owner=project.ownerName||project.owner||'',lender=project.lenderName||project.lender||'',banker=project.bankerName||'',contractor=project.contractorName||'Blackridge Construction, LLC',date=String(pa.applicationDate||pa.createdAt||'').slice(0,10),period=pa.periodThrough;
 // ACP/G702: positions measured against the supplied landscape form.
 t(0,projectName,126,95,375,9);t(0,address,126,109,375,8);t(0,contractor,126,123,375,8);t(0,pa.preparedBy||'',126,137,375,8);
 for(const [value,y] of [[lender,69],[banker,83],[date,97],[pa.number,111],['',125],[period,139]])t(0,value,624,y,120,7);
 [v.original,v.changes,v.contract,v.gross,v.ret,v.net,v.prior,v.due,v.balance].forEach((n,i)=>m(0,n,280,[166,180.5,195,209.5,224,239,253,280.5,295.5][i],76,8));t(0,v.contract?(100*v.gross/v.contract).toFixed(2)+'%':'0.00%',280,309,76,8,false,true);
 t(0,v.changes?'See Change Notification':'No approved changes',44,338,222,6);m(0,v.changes,280,338,76,7);m(0,v.changes,280,408,76,7);m(0,cents(pa.changesThisPeriod??v.changes/100,'Current changes'),280,423,76,7);m(0,cents(pa.previousApprovedChanges??0,'Previous changes'),280,437,76,7);m(0,v.changes,280,451,76,7);
 m(0,v.due,424,265,76,7);t(0,contractor,485,438,255,7);t(0,'UNSIGNED DRAFT',426,450,148,6);t(0,'',604,450,100,7);t(0,project.architectName||'',95,490,259,7);t(0,'DRAFT - NOT APPROVED',380,500,340,9,true);t(0,'Separate preconstruction: $'+amount(v.precon),380,520,340,7);t(0,'Combined SOV billing basis: $'+amount(v.basis),380,532,340,7);
 // CS-1/G703: retain the original 12-column layout; current work includes stored materials.
 const layoutRows=[];let section='';for(const r of v.rows){if(r.section&&r.section!==section){section=r.section;layoutRows.push({heading:section})}layoutRows.push(r)}const perPage=35,chunks=Math.ceil(layoutRows.length/perPage),sovPages=[base[1]];
 for(let i=1;i<chunks;i++){const [copy]=await doc.copyPages(doc,[1]);doc.insertPage(2+i-1,copy);sovPages.push(copy)}
 const cols=[50,66,210,264,306,351,400,449,538,591,658,717,743];
 sovPages.forEach((page,n)=>{
  text(page,projectName,103,81,431,8);text(page,address,103,95,431,7);text(page,pa.number,662,85,78,6);text(page,date,662,98,78,6);text(page,period,662,110,78,6);
  text(page,'Work + stored',402,154,43,4);text(page,'CS '+(n+1)+' / '+chunks,480,67,56,6);
  const display=layoutRows.slice(n*perPage,(n+1)*perPage),chunk=display.filter(r=>!r.heading);
  display.forEach((r,j)=>{const y=164+j*8.43;if(r.heading){text(page,r.heading,66,y,141,4.8,true);return}const values=[r.item,r.description,amount(r.orig),amount(r.co),amount(r.scheduled),amount(r.previous),amount(r.work+r.stored),r.payee,amount(r.total),amount(r.ret),amount(r.balance),r.scheduled?(100*r.total/r.scheduled).toFixed(1)+'%':'0%'];values.forEach((s,k)=>text(page,s,cols[k]+1,y,cols[k+1]-cols[k]-3,k===1?4.8:4.5,false,k!==0&&k!==1&&k!==7))});
  const totals=keys=>keys.map(k=>chunk.reduce((s,r)=>s+r[k],0));
  const fillTotals=(y,ns)=>{[2,3,4,5,6,8,9,10].forEach((k,i)=>text(page,amount(ns[i]),cols[k]+1,y,cols[k+1]-cols[k]-3,4.5,false,true))};
  fillTotals(463,totals(['orig','co','scheduled','previous','work','total','ret','balance']).map((x,i)=>i===4?x+chunk.reduce((s,r)=>s+r.stored,0):x));
  if(n===chunks-1)fillTotals(522,[v.original+v.precon,v.changes,v.basis,v.sum('previous'),v.sum('work')+v.sum('stored'),v.gross,v.ret,v.basis-v.gross]);
  text(page,'Separately authorized preconstruction: $'+amount(v.precon),66,565,670,6);
 });
 // Remaining reference pages are kept in their original order after all continuation pages.
 const change=base[2],transfer=base[3],ack=base[4];
 text(change,contractor,118,130,138,8);text(change,projectName,118,142,138,8);text(change,pa.number,365,142,194,8);text(change,date,365,154,194,8);
 const cos=Array.isArray(pa.changeOrders)?pa.changeOrders:v.rows.filter(r=>r.co!==0).map(r=>({description:r.description,amount:r.co/100}));
 cos.slice(0,4).forEach((co,i)=>{text(change,co.description||'',92,347+i*14,247,7);text(change,amount(cents(co.amount,'Change order amount')),365,347+i*14,194,7,false,true)});
 text(change,'',62,195,10,9);text(change,'CHANGE DETAILS REQUIRE REVIEW',92,407,247,6,true);text(change,amount(cents(pa.previousApprovedChanges??0,'Previous changes')),365,281,194,8,false,true);text(change,amount(cents(pa.changesThisPeriod??v.changes/100,'Current changes')),365,419,194,8,false,true);text(change,amount(v.changes),365,439,194,8,false,true);
 text(transfer,pa.number,460,98,80,7);text(transfer,date,460,113,80,7);
 for(const [s,x,y,w] of [[owner,140,140,160],[address,140,152,160],[contractor,140,182,160],[projectName,385,140,154],[address,385,152,154],[lender,385,182,154],[contractor,140,606,160],[lender,140,628,160],[owner,140,650,160]])text(transfer,s,x,y,w,7);
 (pa.transfers||[]).slice(0,11).forEach((r,i)=>{text(transfer,r.fromLine,76,283+i*15.7,52,7);text(transfer,amount(cents(r.amount,'Transfer amount')),140,283+i*15.7,95,7,false,true);text(transfer,r.toLine,243,283+i*15.7,57,7);text(transfer,r.reason||'',311,283+i*15.7,228,6)});
 text(ack,projectName,122,108,228,7);text(ack,address,122,121,228,6);text(ack,pa.number,497,108,88,7);text(ack,date,497,121,88,7);text(ack,period,497,137,88,7);
 for(const [s,y] of [[owner,150],[address,161],[contractor,180],['PO Box 319',191],['512-827-7020',201],[lender,210]])text(ack,s,122,y,224,6);
 [v.original,v.changes,v.contract,v.gross,v.ret,v.net,v.prior,v.due,v.balance].forEach((n,i)=>text(ack,amount(n),497,170+i*9.9,89,6,false,true));text(ack,amount(v.due),283,333,73,8,false,true);text(ack,'Not calculated - loan data required',494,343,92,4);text(ack,pa.notes||'',58,488,526,6);text(ack,owner,122,620,178,7);
 for(const page of doc.getPages())text(page,'UNSIGNED DRAFT - REVIEW REQUIRED',44,page.getHeight()-14,page.getWidth()-88,6,true);
 doc.setTitle('Pay Application '+pa.number+' - '+projectName);doc.setAuthor(contractor);doc.setSubject('Generated draft; no electronic signatures or delivery');
 return {bytes:await doc.save(),summary:{currentPaymentDue:v.due/100,constructionContract:v.contract/100,combinedSovBasis:v.basis/100,pageCount:doc.getPageCount()}};
}
let loading;
async function loadLibrary(){if(root.PDFLib)return root.PDFLib;if(!loading)loading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/vendor/pdf-lib-1.17.1.min.js';script.onload=()=>resolve(root.PDFLib);script.onerror=()=>{loading=null;reject(Error('Unable to load PDF renderer'))};document.head.append(script)});return loading}
async function open(record){
 const api=root.tcOwnerPayApps;if(!api)throw Error('Pay application module unavailable');
 if(String(record.status||'Draft').toLowerCase()!=='draft')throw Error('Only draft applications can generate a new review PDF');
 reconcile(record);const stable=r=>{const x=structuredClone(r);delete x.serverDraftId;delete x.updatedAt;return JSON.stringify(x)};const sourceSnapshot=stable(record),snapshot=structuredClone(record),project=structuredClone(api.getCurrentProject());const lib=await loadLibrary();const response=await fetch('/templates/blackridge-payapp-blank.pdf');if(!response.ok)throw Error('Blackridge form template unavailable');const result=await render({templateBytes:await response.arrayBuffer(),payapp:snapshot,project,PDFLib:lib});
 const blob=new Blob([result.bytes],{type:'application/pdf'}),url=URL.createObjectURL(blob),overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:200001;background:#18212a;padding:16px;display:flex;flex-direction:column';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Generated pay application PDF');
 const bar=document.createElement('div');bar.style.cssText='background:white;padding:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap';const label=document.createElement('strong');label.textContent='PA #'+record.number+' - unsigned draft - $'+amount(Math.round(result.summary.currentPaymentDue*100));const download=document.createElement('a');download.className='btn';download.textContent='Download / Print PDF';download.href=url;download.download='Pay-App-'+record.number+'-Draft.pdf';const save=document.createElement('button');save.className='btn bronze';save.textContent='Save PDF to This Application';const close=document.createElement('button');close.className='btn';close.textContent='Close';const status=document.createElement('p');status.setAttribute('role','status');status.style.cssText='background:white;padding:10px;margin:0';status.textContent='Generated from reconciled SOV. Review all pages. Saving does not sign, submit, or notify anyone.';const frame=document.createElement('iframe');frame.title='Generated Blackridge payment application';frame.src=url;frame.style.cssText='flex:1;width:100%;border:0;background:white';bar.append(label,download,save,close);overlay.append(bar,status,frame);document.body.append(overlay);close.onclick=()=>{overlay.remove();URL.revokeObjectURL(url)};
 save.onclick=async()=>{save.disabled=true;status.textContent='Saving PDF securely...';try{if(stable(record)!==sourceSnapshot)throw Error('Application changed after generation; close and generate again');if(api.getCurrentProject()?.id!==project.id)throw Error('Project changed after generation');await api.persistDraft(record);let binary='';const bytes=new Uint8Array(result.bytes);for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));await api.documentRequest('uploadDocument',record,{kind:'signature_pdf',fileName:download.download,base64:btoa(binary)});status.textContent='PDF saved to PA #'+record.number+'. Open Manage Documents to retrieve it. This remains an unsigned draft; signature routing has not been verified.';save.textContent='PDF Saved'}catch(e){status.textContent='PDF NOT SAVED: '+e.message;save.disabled=false}};
 return result;
}
const api={reconcile,render,open};root.tcNativePayappPdf=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
