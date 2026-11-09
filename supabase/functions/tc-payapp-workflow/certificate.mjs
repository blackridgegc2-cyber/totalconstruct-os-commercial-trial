// Shared production renderer exercised with real pdf-lib in release verification.
export function assertNoDigitalSeal(pdf){
 for(const [,value] of pdf.context.enumerateIndirectObjects()){
  if(typeof value.keys==='function'&&value.keys().some(key=>key.toString()==='/ByteRange'))throw Error('This PDF already has a digital seal. Preserve and verify the original; create an unsigned approval copy before using native signing.');
 }
}
export async function appendCertificate(bytes,evidence,lib){
 const {PDFDocument,StandardFonts,rgb}=lib,pdf=await PDFDocument.load(bytes,{ignoreEncryption:false});
 assertNoDigitalSeal(pdf);
 const font=await pdf.embedFont(StandardFonts.Helvetica);let page,y;
 const newPage=()=>{page=pdf.addPage([612,792]);y=748};newPage();
 const write=(text,size=10)=>{
  text=String(text);let line='';
  for(const char of text){if(font.widthOfTextAtSize(line+char,size)>536){if(y<50)newPage();page.drawText(line,{x:38,y,size,font,color:rgb(.08,.1,.12)});y-=17;line=''}line+=char}
  if(y<50)newPage();page.drawText(line,{x:38,y,size,font,color:rgb(.08,.1,.12)});y-=25;
 };
 write('TOTAL CONNECT - ELECTRONIC SIGNATURE CERTIFICATE',12);
 for(const text of ['Pay application: '+evidence.payappId,'Workflow: '+evidence.workflowId,'Signer: '+evidence.name,'Verified account: '+evidence.email,'Capacity: '+evidence.capacity,'Time (UTC): '+evidence.at,'Authentication: authenticated account with explicit consent','I agree to electronic records and intend to '+evidence.intent+' this pay application.','Original PDF SHA-256:',evidence.originalHash,'Reviewed PDF SHA-256:',evidence.reviewedHash,'This certificate is attached to and forms part of this PDF.','This records an electronic signature. It does not assert biometric authentication or a certificate-based digital seal.'])write(text);
 return pdf.save();
}
