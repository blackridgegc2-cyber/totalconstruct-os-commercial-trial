(()=>{
 'use strict';
 const keys=['accounting','equipment','moduleConfig','storage','vaultProjects','legalHolds','invites','audit','taxModel','companyHealth','capitalPlan','overhead','branding','bidBoard','templateLibrary'];
 const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
 let production=null,training=null,inTraining=false;
 const current=()=>{try{return typeof currentProject==='function'?currentProject():null}catch(e){return null}};
 const isTraining=()=>!!window.tcIsTrainingProject?.(current());
 function capture(names){const out={};for(const k of names)out[k]=clone(state?.[k]);return out}
 function apply(snapshot){if(!snapshot||!window.state)return;for(const k of keys){if(snapshot[k]===undefined)delete state[k];else state[k]=clone(snapshot[k])}}
 function enter(){if(inTraining||!window.state)return;production=capture(keys);training=training||capture(keys);apply(training);inTraining=true;window.state.trainingCompanySandbox=true}
 function leave(){if(!inTraining||!window.state)return;training=capture(keys);apply(production||{});production=null;inTraining=false;window.state.trainingCompanySandbox=false}
 function sync(){if(!window.state||!window.tcIsTrainingProject)return;if(isTraining())enter();else leave()}
 function guardCompanyWrite(){const cloud=window.tcCloud;if(!cloud||cloud.__tcTrainingSandboxGuard)return;const prior=cloud.writeCompanySnapshot;if(typeof prior==='function'){cloud.writeCompanySnapshot=async function(){if(isTraining())return false;return prior.apply(this,arguments)}}cloud.__tcTrainingSandboxGuard=true}
 function banner(){const app=document.getElementById('app');if(!app)return;let b=document.getElementById('tcTrainingSandboxBanner');if(!b){b=document.createElement('div');b.id='tcTrainingSandboxBanner';b.className='callout';b.style.cssText='display:none;margin:10px 16px;padding:8px 12px;position:relative;z-index:20';b.innerHTML='<b>Training Sandbox:</b> project activity may be tested here, but Training Center data and company-model edits are isolated from production WIP, cost, overhead, tax, capital, accounting and company snapshots.';app.prepend(b)}b.style.display=isTraining()?'block':'none'}
 function wire(){guardCompanyWrite();sync();banner();const sel=document.getElementById('projectSelect');if(sel&&!sel.dataset.tcTrainingSandbox){sel.dataset.tcTrainingSandbox='1';sel.addEventListener('change',()=>setTimeout(()=>{sync();banner();if(typeof renderAll==='function')renderAll()},0))}}
 new MutationObserver(wire).observe(document.documentElement,{subtree:true,childList:true});addEventListener('DOMContentLoaded',wire);setTimeout(wire,700);setTimeout(wire,1600);
 window.tcTrainingCompanySandbox={sync,isActive:()=>inTraining};
})();