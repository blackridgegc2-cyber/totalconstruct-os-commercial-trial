(()=>{
'use strict';
const now=()=>new Date().toISOString();
function clone(v){try{return JSON.parse(JSON.stringify(v))}catch{return null}}
function branding(){const b=window.tcCompanyBranding?.get?.()||state.branding||{};return {companyName:b.companyName||'TotalConstruct Company',logoDataUrl:b.logoDataUrl||'',logoFileName:b.logoFileName||'',logoVersion:Number(b.logoVersion||0),logoPolicy:clone(b.logoPolicy||{}),capturedAt:now()}}
function refs(){try{return clone(window.tcProjectLifecycle?.exactReferences?.()||window.tcProjectLifecycle?.snapshot?.()?.contractDrawingReferences||[])||[]}catch{return []}}
function fingerprint(s){const raw=JSON.stringify(s||{});let h=2166136261;for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619)}return `TC-${(h>>>0).toString(16).padStart(8,'0')}-${raw.length}`}
function enrich(d){if(!d?.issuedSnapshot)return d;const s=d.issuedSnapshot;if(!s.brandingSnapshot)s.brandingSnapshot=branding();if(!s.documentReferences)s.documentReferences=refs();if(!s.integrity)s.integrity={scheme:'TC-FNV1A32-v1',fingerprint:fingerprint({...s,integrity:undefined}),capturedAt:d.issuedAt||now()};d.issuedIntegrity=d.issuedIntegrity||clone(s.integrity);return d}
function enrichAll(){const list=state.professionalDocuments||[];let n=0;for(const d of list)if(d?.issuedSnapshot&&!d.issuedSnapshot.integrity){enrich(d);n++}if(n)window.save?.('Issued document integrity metadata added',`${n} record(s)`);return n}
function install(){enrichAll();const api=window.tcProfessionalDocumentLog;if(api&&!api.integrity){api.integrity={enrich,enrichAll,fingerprint,branding,refs};const oldView=api.viewIssued;api.viewIssued=id=>{const d=(state.professionalDocuments||[]).find(x=>x.id===id);if(d)enrich(d);return oldView?.(id)}}}
addEventListener('tc:r1-ready',()=>setTimeout(install,120));addEventListener('DOMContentLoaded',()=>setTimeout(install,500));document.addEventListener('click',e=>{if(e.target.closest?.('[data-tc-log-issued],[data-tcdl-log],[data-tc-doc-issue]'))setTimeout(install,80)},true);setTimeout(install,1100);
window.tcIssuedDocumentIntegrity={enrich,enrichAll,fingerprint,branding,refs,install};
})();