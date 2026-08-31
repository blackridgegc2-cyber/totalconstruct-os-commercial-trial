const fs=require('fs');
const required=['r1-training-finance-gate.js','r1-training-company-sandbox.js','r1-invite-status.js','r1-feedback-center.js','r1-feedback-cloud.js','r1-feedback-attachments.js','r1-project-drilldown.js','r1-suite-integration.js','r1-legacy-action-guard.js','r1-legacy-surface.js'];
const app=fs.readFileSync('api/app.js','utf8');
const errors=[];
for(const f of required){
  if(!fs.existsSync(f))errors.push(`Missing modern R1 module: ${f}`);
  if(!app.includes(`'${f}'`)&&!app.includes(`\"${f}\"`))errors.push(`api/app.js does not inject ${f}`);
}
const must=(f,tokens)=>{if(!fs.existsSync(f))return;const s=fs.readFileSync(f,'utf8');for(const t of tokens)if(!s.includes(t))errors.push(`${f} missing: ${t}`)};
must('r1-training-finance-gate.js',['companyhealth','controller','capitalplan','tcIsTrainingProject']);
must('r1-feedback-center.js',['Platform Feedback / Improvement Center','Released','releaseVersion','tcFeedbackCloud?.push']);
must('r1-feedback-cloud.js',['platform_feedback_events','released_at','release_version','notifyRelease']);
must('r1-project-drilldown.js',['tcOpenProject','#wip','#fees','#resources','#companyhealth','#controller','#capitalplan']);
must('r1-suite-integration.js',['integrationOutbox','contractVersion','payroll.actual_cost','labor.actual_cost']);
must('r1-legacy-action-guard.js',['addTask','addTime','addEmployee','addUser','addMessage','globalCreate']);
if(errors.length){console.error('\nR1 MODERN MODULE CHECK FAILED');for(const e of errors)console.error(' - '+e);process.exit(1)}
console.log(`R1 modern module gate passed (${required.length} modules checked).`);
