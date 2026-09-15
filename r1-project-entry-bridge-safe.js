(()=>{
'use strict';
function install(){
  const intake=window.tcNewProjectIntake;
  if(!intake?.open)return false;
  window.addProject=function(){return intake.open()};
  return true;
}
if(!install()){
  let tries=0;
  const timer=setInterval(()=>{tries+=1;if(install()||tries>=40)clearInterval(timer)},250);
}
addEventListener('tc:r1-ready',()=>setTimeout(install,0));
window.tcProjectEntryBridge={install};
})();
