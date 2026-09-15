(()=>{
'use strict';
if(window.tcTrainingLearningCenter)return;
const LESSONS=[
 ['Getting Started','dashboard','Navigate TotalConstruct, switch projects, use global search and understand role-based dashboards.'],
 ['Projects & Setup','projects','Create and edit project information, staffing, permissions and project standards.'],
 ['Drawings','drawings','Upload drawing sets, preserve revisions, review source references and navigate current/superseded sheets.'],
 ['RFIs','rfis','Create, edit, route, respond, preview, issue, track and close RFIs.'],
 ['Submittals','submittals','Build the submittal register, create packages, route reviews, track status and close records.'],
 ['Contracts & Buyout','contracts','Create and manage commitments, subcontract/work-order records, buyout and contract administration.'],
 ['Change Management','changeorders','Create potential changes and change orders, document cost/schedule impact, route approvals and preserve issued records.'],
 ['Financials & Pay Apps','financials','Navigate budgets, commitments, owner pay applications, invoices, retainage and financial reporting.'],
 ['Schedule','schedule','Create and update activities, milestones and schedule impacts and understand project schedule reporting.'],
 ['Daily Reports & Meetings','dailyreports','Complete daily reports and meeting minutes, add participants/action items, preview, issue and track.'],
 ['Safety & Quality','safety','Complete incident, toolbox-talk, inspection and punch workflows and track closure.'],
 ['Documents & Transmittals','documents','Upload/store documents, complete professional forms, run completeness checks, preview, issue and archive exact revisions.'],
 ['Closeout','closeout','Manage turnover, closeout transmittals, punch completion, warranties and final project records.'],
 ['Administration & Users','admin','Invite/manage users, understand permissions and company/project standards.']
].map((x,i)=>({id:'tc-lesson-'+(i+1),title:x[0],route:x[1],summary:x[2]}));
function isTraining(){try{return !!(window.tcIsTrainingProject?window.tcIsTrainingProject():/training/i.test(document.querySelector('.project-select')?.selectedOptions?.[0]?.textContent||''))}catch{return false}}
function go(route){
 const el=[...document.querySelectorAll('[data-page],.nav')].find(n=>(n.dataset.page||n.dataset.route||'').toLowerCase()===route.toLowerCase()||n.textContent.trim().toLowerCase().includes(route.toLowerCase()));
 if(el){el.click();return true}return false;
}
function shell(){
 let m=document.getElementById('tcLearningCenter');if(m)return m;
 m=document.createElement('div');m.id='tcLearningCenter';m.className='modal hidden';
 m.innerHTML=`<div style="position:absolute;inset:4vh 4vw;background:#f6f7f8;border-radius:16px;overflow:auto;box-shadow:0 30px 80px #0006"><div style="position:sticky;top:0;z-index:2;background:#13202a;color:#fff;padding:18px 22px;display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:11px;letter-spacing:1.5px;color:#d6a05d;font-weight:800">TOTALCONSTRUCT OS TRAINING PROJECT</div><h2 style="margin:4px 0">Interactive Learning Center</h2><div style="font-size:12px;color:#b8c4cc">Learn the workflow, then open the real section and practice safely in Training.</div></div><button class="btn" data-tc-learn-close>Close</button></div><div style="padding:20px"><div class="callout" style="margin-bottom:14px"><b>Full System Demo</b><br>Start here for the complete commercial-project walkthrough. The lesson sequence follows project setup → preconstruction/buyout → construction administration → field/financial controls → closeout.</div><div data-tc-lessons style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px"></div></div></div>`;
 document.body.appendChild(m);
 const box=m.querySelector('[data-tc-lessons]');
 LESSONS.forEach((l,i)=>{const c=document.createElement('div');c.className='card';c.innerHTML=`<div class="eyebrow">LESSON ${i+1}</div><h3 style="margin-top:5px">${l.title}</h3><p class="split-note">${l.summary}</p><div class="inline"><button class="btn primary" data-tc-open="${l.route}">Open this section</button><button class="btn" data-tc-try="${l.route}">Try it in Training</button><button class="btn" data-tc-next="${i+1}">${i===LESSONS.length-1?'Finish':'Next lesson'}</button></div></div>`;box.appendChild(c)});
 m.addEventListener('click',e=>{if(e.target.closest('[data-tc-learn-close]'))m.classList.add('hidden');const r=e.target.dataset.tcOpen||e.target.dataset.tcTry;if(r){m.classList.add('hidden');go(r)}const n=Number(e.target.dataset.tcNext);if(n&&n<LESSONS.length){box.children[n].scrollIntoView({behavior:'smooth',block:'center'})}});
 return m;
}
function open(){shell().classList.remove('hidden')}
function install(){
 if(document.getElementById('tcTrainingHelpBtn'))return;
 const b=document.createElement('button');b.id='tcTrainingHelpBtn';b.className='btn bronze';b.textContent='Training & Tutorials';b.title='Open the TotalConstruct OS Interactive Learning Center';b.addEventListener('click',open);
 const host=document.querySelector('header .actions,header,.topmenus');if(host)host.appendChild(b);
 if(!isTraining())b.style.display='none';
 document.addEventListener('change',e=>{if(e.target.matches?.('.project-select'))b.style.display=isTraining()?'':'none'});
}
window.tcTrainingLearningCenter={open,lessons:LESSONS,isTraining,go};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();