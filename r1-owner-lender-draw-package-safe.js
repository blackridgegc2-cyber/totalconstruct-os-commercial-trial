/* TotalConstruct Owner/Lender Draw Package selection.
 * UI-only export manifest. Transmission must be performed by an authenticated
 * server endpoint after project-scoped authorization, never from this module.
 */
(()=>{'use strict';
const DEFAULT_SHEETS=Object.freeze(['ACP','CS-1','CHANGES','SVTN','OA']);
const normalize=s=>String(s||'').trim().toUpperCase();
function selection(available,optional=[]){
 const known=new Set((available||[]).map(normalize));
 const required=DEFAULT_SHEETS.filter(x=>known.has(x));
 const missing=DEFAULT_SHEETS.filter(x=>!known.has(x));
 const extras=[...new Set(optional.map(normalize))].filter(x=>known.has(x)&&!DEFAULT_SHEETS.includes(x));
 return {required,missing,optional:extras,ordered:[...required,...extras],ready:missing.length===0};
}
function validateBeforeSend({availableSheets,optionalSheets,approved,recipient,notaryRequired=false,notaryCompleted=false}={}){
 const s=selection(availableSheets,optionalSheets||[]);
 const errors=[];
 if(!s.ready)errors.push('Missing required sheets: '+s.missing.join(', '));
 if(!approved)errors.push('Owner approval has not been recorded.');
 if(!recipient||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))errors.push('Valid authorized recipient email required.');
 if(notaryRequired&&!notaryCompleted)errors.push('Required notarization is incomplete.');
 return {...s,errors,canSubmit:errors.length===0};
}
function makePicker(available,onChange){
 const wrap=document.createElement('section');wrap.className='tc-draw-package-picker';
 const heading=document.createElement('h3');heading.textContent='Owner / Lender Draw Package';wrap.append(heading);
 const intro=document.createElement('p');intro.textContent='Required by default: ACP, CS-1, CHANGES, SVTN, OA. All other worksheets are excluded unless selected.';wrap.append(intro);
 const chosen=new Set();for(const name of available||[]){const n=normalize(name);const label=document.createElement('label');label.style.cssText='display:block;margin:7px 0';const box=document.createElement('input');box.type='checkbox';box.checked=DEFAULT_SHEETS.includes(n);box.disabled=DEFAULT_SHEETS.includes(n);box.addEventListener('change',()=>{box.checked?chosen.add(n):chosen.delete(n);onChange?.(selection(available,[...chosen]))});label.append(box,document.createTextNode(' '+name+(box.disabled?' (required)':' (optional)')));wrap.append(label)}
 onChange?.(selection(available,[]));return wrap;
}
function mount(project,pa){
 const target=document.querySelector('#payapps');if(!target||!project||!pa)return;
 const card=document.createElement('div');card.className='card section';card.style.marginTop='16px';
 const heading=document.createElement('h3');heading.textContent='Owner / Lender Submission Package — Preview';card.append(heading);
 const warning=document.createElement('p');warning.textContent='Submission is not connected to secure lender delivery. Do not treat this preview as a transmitted draw.';card.append(warning);
 const available=Array.isArray(pa.workbookSheets)?pa.workbookSheets:[];
 const summary=document.createElement('p');card.append(summary);
 const update=s=>{summary.textContent=s.ready?'Selected worksheet order: '+s.ordered.join(' → '):'Workbook not verified. Missing required worksheets: '+s.missing.join(', ');summary.style.color=s.ready?'inherit':'#a03a2d'};
 card.append(makePicker(available,update));
 const note=document.createElement('p');note.textContent='Upload and validate the actual lender workbook before export. Optional attachments require explicit selection for each pay application.';card.append(note);
 target.append(card);
}
window.tcDrawPackage={DEFAULT_SHEETS,selection,validateBeforeSend,makePicker,mount};
})();