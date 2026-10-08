(()=>{'use strict';
if(window.tcCanonicalProjectCreate)return;
const FOLDERS=[['01','Inception & Pursuit'],['02','Preconstruction'],['03','Design - Progress Drawings'],['04','Contract Drawings & Specifications'],['05','Budgets & Estimates'],['06','Prime Contract & Owner Changes'],['07','Subcontracts & Procurement'],['08','Construction Administration'],['09','Field Records'],['10','Closeout & Turnover'],['11','Warranty'],['99','Archive']];
const now=()=>new Date().toISOString();
function clean(v){return String(v??'').trim()}
function num(v){if(typeof v==='number')return Number.isFinite(v)?v:0;const n=Number(String(v??'').replace(/[$,% ,]/g,''));return Number.isFinite(n)?n:0}
function uniqueId(){return 'PRJ-'+Date.now()+'-'+Math.random().toString(36).slice(2,7).toUpperCase()}
async function createProject(payload={},files=[]){
 const name=clean(payload.name);
 if(!name)throw new Error('Project Name is required.');
 if(!window.tcCloud?.createProject)throw new Error('Authenticated database project creation is not connected. Local-only creation is disabled.');
 // Cloud implementation must save the project and each original source document.
 // Do not report success if any required upload is missing.
 const result=await window.tcCloud.createProject(payload,files);
 if(!result||!result.id||!/^[0-9a-f-]{36}$/i.test(String(result.id)))
  throw new Error('Project service did not confirm a persistent UUID.');
 if(files.length && (!Array.isArray(result.uploadedFiles)||result.uploadedFiles.length!==files.length))
  throw new Error('Project created, but original source upload verification failed. Reconcile before proceeding.');
 return result;
}
function install(){if(window.tcProjectLifecycle&&!window.tcProjectLifecycle.createProject)window.tcProjectLifecycle.createProject=createProject}
window.tcCanonicalProjectCreate={createProject,install};install();addEventListener('tc:r1-ready',install);setTimeout(install,500);
})();