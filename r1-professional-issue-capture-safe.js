(()=>{
'use strict';
const now=()=>new Date().toISOString();
function clone(v){try{return JSON.parse(JSON.stringify(v))}catch{return null}}
function branding(){const b=window.tcCompanyBranding?.get?.()||state.branding||{};return {companyName:b.companyName||'TotalConstruct Company',logoDataUrl:b.logoDataUrl||'',logoFileName:b.logoFileName||'',logoVersion:Number(b.logoVersion||0),logoPolicy:clone(b.logoPolicy||{}),capturedAt:now()}}
function refs(){try{return clone(window.tcProjectLifecycle?.exactReferences?.()||window.tcProjectLifecycle?.snapshot?.()?.contractDrawingReferences||[])||[]}catch{return []}}
function fingerprint(s){return window.tcIssuedDocumentIntegrity?.fingerprint?.(s)||(()=>{const raw=JSON.stringify(s||{});let h=2166136261;for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619)}return `TC-${(h>>>0).toString(16).padStart(8,'0')}-${raw.length}`})()}
function capture(d){if(!d?.issuedSnapshot)return d;const issuedAt=d.issuedAt||d.issuedSnapshot.issuedAt||now();if(!d.issuedArchiveMetadata)d.issuedArchiveMetadata={brandingSnapshot:branding(),documentReferences:refs(),integrity:{scheme:'TC-FNV1A32-v1',fingerprint:fingerprint(d.issuedSnapshot),capturedAt:issuedAt},capturedAt:issuedAt,captureMode:'Issue-time'};d.issuedIntegrity=d.issuedIntegrity||clone(d.issuedArchiveMetadata.integrity);return d}
function scan(){for(const d of state.professionalDocuments||[])if(d?.issuedSnapshot&&!d.issuedArchiveMetadata)capture(d)}
function install(){scan();document.addEventListener('click',e=>{if(!e.target.closest?.('[data-tc-doc-issue]'))return;const before=new Set((state.professionalDocuments||[]).filter(d=>d.issuedSnapshot).map(d=>d.id));setTimeout(()=>{for(const d of state.professionalDocuments||[])if(d.issuedSnapshot&&(!before.has(d.id)||!d.issuedArchiveMetadata))capture(d)},0)},true)}
addEventListener('tc:r1-ready',()=>setTimeout(install,140),{once:true});addEventListener('DOMContentLoaded',()=>setTimeout(install,520),{once:true});setTimeout(install,1200);
window.tcProfessionalIssueCapture={capture,scan,branding,refs,fingerprint,install};
})();