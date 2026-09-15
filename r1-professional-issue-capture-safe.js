(()=>{
'use strict';
const now=()=>new Date().toISOString();
let installed=false;
function clone(v){try{return JSON.parse(JSON.stringify(v))}catch{return null}}
function branding(){const b=window.tcCompanyBranding?.get?.()||state.branding||{};return {companyName:b.companyName||'TotalConstruct Company',logoDataUrl:b.logoDataUrl||'',logoFileName:b.logoFileName||'',logoVersion:Number(b.logoVersion||0),logoPolicy:clone(b.logoPolicy||{}),capturedAt:now()}}
function refs(){try{return clone(window.tcProjectLifecycle?.exactReferences?.()||window.tcProjectLifecycle?.snapshot?.()?.contractDrawingReferences||[])||[]}catch{return []}}
function fingerprint(s){return window.tcIssuedDocumentIntegrity?.fingerprint?.(s)||(()=>{const raw=JSON.stringify(s||{});let h=2166136261;for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619)}return `TC-${(h>>>0).toString(16).padStart(8,'0')}-${raw.length}`})()}
function capture(d,mode='issue-time'){
 if(!d?.issuedSnapshot)return d;
 if(window.tcIssuedDocumentIntegrity?.capture)return window.tcIssuedDocumentIntegrity.capture(d,mode);
 d.issuedArchiveMeta=d.issuedArchiveMeta||{};
 const m=d.issuedArchiveMeta,issuedAt=d.issuedAt||d.issuedSnapshot.issuedAt||now();
 if(!m.brandingSnapshot)m.brandingSnapshot=branding();
 if(!m.documentReferences)m.documentReferences=refs();
 if(!m.integrity)m.integrity={scheme:'TC-FNV1A32-v1',fingerprint:fingerprint(d.issuedSnapshot),snapshotLength:JSON.stringify(d.issuedSnapshot||{}).length,capturedAt:issuedAt};
 m.captureMode=m.captureMode||mode;
 m.issuedAt=m.issuedAt||issuedAt;
 m.sourceSnapshotImmutable=true;
 d.issuedIntegrity=d.issuedIntegrity||clone(m.integrity);
 return d
}
function scan(){let n=0;for(const d of state.professionalDocuments||[])if(d?.issuedSnapshot&&!d.issuedArchiveMeta){capture(d,'legacy-post-issue');n++}return n}
function captureNew(beforeIssued){setTimeout(()=>{let n=0;for(const d of state.professionalDocuments||[]){if(!d?.issuedSnapshot)continue;if(!beforeIssued.has(d.id)&&!d.issuedArchiveMeta){capture(d,'issue-time');n++}}if(n)window.save?.('Issued archive metadata captured at issue time',`${n} record(s)`)},0)}
function install(){if(installed)return;installed=true;scan();document.addEventListener('click',e=>{const trigger=e.target.closest?.('#tcDocIssue,[data-tc-doc-issue]');if(!trigger)return;const beforeIssued=new Set((state.professionalDocuments||[]).filter(d=>d?.issuedSnapshot).map(d=>d.id));captureNew(beforeIssued)},true)}
addEventListener('tc:r1-ready',()=>setTimeout(install,140),{once:true});addEventListener('DOMContentLoaded',()=>setTimeout(install,520),{once:true});setTimeout(install,1200);
window.tcProfessionalIssueCapture={capture,scan,branding,refs,fingerprint,install};
})();