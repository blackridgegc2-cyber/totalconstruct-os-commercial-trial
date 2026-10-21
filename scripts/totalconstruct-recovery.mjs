/**
 * Fail-closed, recoverable task dispatch. The controller uses GitHub Issues
 * as durable queue; an external authenticated agent worker must be configured.
 * It does NOT bypass model quotas or autonomously merge/deploy code.
 */
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const repo = process.env.GITHUB_REPOSITORY;
const endpoint = process.env.TC_AGENT_ENDPOINT;
const token = process.env.TC_AGENT_TOKEN;
const dryRun = process.env.TC_DRY_RUN === 'true';
const maxAttempts = Number(process.env.TC_MAX_ATTEMPTS || 4);
const budget = Number(process.env.TC_MONTHLY_BUDGET_USD || 200);
const label = 'tc-agent-task';
const gh = (args) => execFileSync('gh',args,{encoding:'utf8'}).trim();
const issueView = n => JSON.parse(gh(['issue','view',String(n),'--repo',repo,'--json','number,title,body,labels,comments,state']));
const labels = issue => new Set(issue.labels.map(l=>l.name));
function comment(n, body){ gh(['issue','comment',String(n),'--repo',repo,'--body',body]); }
function replaceStatus(n, previous, next) {
  for(const s of previous) gh(['issue','edit',String(n),'--repo',repo,'--remove-label',s]);
  gh(['issue','edit',String(n),'--repo',repo,'--add-label',next]);
}
function meta(issue){
  const data = issue.body.match(/<!-- TC_CONTROLLER (\{[^\n]*\}) -->/);
  if(!data) return null;
  try{return JSON.parse(data[1]);}catch{return null;}
}
async function main(){
  if(!repo)throw Error('GITHUB_REPOSITORY required');
  const raw=gh(['issue','list','--repo',repo,'--state','open','--label',label,'--limit','100','--json','number']);
  const issues=JSON.parse(raw).map(i=>issueView(i.number));
  const active=issues.filter(i=>labels(i).has('tc-running'));
  if(active.length){console.log('Active task exists; wait for worker callback or admin recovery.');return;}
  const pending=issues.filter(i=>labels(i).has('tc-queued') || labels(i).has('tc-retry'));
  if(!pending.length){console.log('No queued recovery tasks.');return;}
  const issue=pending[0], config=meta(issue),attempts=(config?.attempts ?? 0);
  if(!config || !config.acceptance || !config.scope){console.log('Unstructured issue; skipped',issue.number);return;}
  if(config.requiresApproval){console.log('Human approval required for',issue.number);return;}
  if(attempts>=maxAttempts){console.log('Retry ceiling reached',issue.number);return;}
  if(!Number.isFinite(budget)||budget<=0){console.log('Budget disabled');return;}
  if(!endpoint||!token){console.log('Agent worker is NOT connected. No task dispatched. Set TC_AGENT_ENDPOINT and TC_AGENT_TOKEN secrets.');return;}
  if(!endpoint.startsWith('https://'))throw Error('TC_AGENT_ENDPOINT must use HTTPS');
  if(dryRun){console.log('Dry-run: would dispatch issue',issue.number);return;}
  const nonce=randomUUID();
  const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json','authorization': 'Bearer '+token,'idempotency-key':repo+'/'+issue.number+'/'+(attempts+1)},body:JSON.stringify({repo,issue:issue.number,attempt:attempts+1,nonce,scope:config.scope,acceptance:config.acceptance,baseBranch:'main',maxBudgetUSD:budget,requiresPullRequest:true,forbidProductionDeploy:true}) ,signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('Worker rejected dispatch: HTTP '+response.status);
  // Never publish credentials, worker response or raw secrets to issue comments.
  replaceStatus(issue.number,['tc-queued','tc-retry'],'tc-running');
  comment(issue.number,'Controller dispatched attempt '+(attempts+1)+'. Worker must open a PR, post verification evidence, and mark the issue complete or retry. No direct production deployment authorized.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
