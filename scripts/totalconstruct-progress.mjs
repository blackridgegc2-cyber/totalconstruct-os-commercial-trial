import {execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
const repo=process.env.GITHUB_REPOSITORY;
if(!repo)throw Error('GITHUB_REPOSITORY missing');
const gh=args=>JSON.parse(execFileSync('gh',args,{encoding:'utf8'}));
const tasks=gh(['issue','list','--repo',repo,'--state','all','--label','tc-agent-task','--limit','200','--json','number,title,state,labels,url,updatedAt']);
const prs=gh(['pr','list','--repo',repo,'--state','all','--limit','100','--json','number,title,state,isDraft,mergedAt,url']);
const has=(x,n)=>x.labels.some(l=>l.name===n);
const stage=t=>has(t,'tc-blocked')?'blocked':has(t,'tc-running')?'running':has(t,'tc-done')?'done':has(t,'tc-retry')?'retry':has(t,'tc-queued')?'queued':t.state==='CLOSED'?'closed':'unclassified';
const counts={total:tasks.length,queued:0,running:0,retry:0,blocked:0,done:0,closed:0,unclassified:0};
tasks.forEach(t=>counts[stage(t)]++);
const completed=counts.done+counts.closed;
const markdown=[
'# Total Construct Development — Progress Snapshot',
'',
'> Generated from GitHub issue labels. **This is development task tracking, not proof of production acceptance.**',
'',
'| Measure | Current |',
'|---|---:|',
...Object.entries({...counts,completionRate:counts.total?Math.round(100*completed/counts.total)+'%':'Not established'}).map(([k,v])=>`| ${k} | ${v} |`),
'',
'## Task register',
'| Issue | Status | Updated |',
'|---|---|---|',
...tasks.map(t=>`| [#${t.number}: ${t.title.replaceAll('|','/')}](${t.url}) | ${stage(t)} | ${t.updatedAt} |`),
'',
'## Pull requests (recent)',
...prs.slice(0,30).map(p=>`- [#${p.number}: ${p.title}](${p.url}) — ${p.mergedAt?'merged':p.isDraft?'draft':p.state.toLowerCase()}`),
'',
'## Release gate',
'**Not approved by this report.** Required: verified accounting reconciliation, role/isolation tests, end-to-end PM workflow tests, scheduling, AI diagnostics, integration tests, and owner acceptance.',
'',
'## Automation status',
'The hourly recovery controller only dispatches work when an external authenticated coding worker is configured. Until connected, this snapshot can still report issues and PRs, but coding will not automatically progress.'
].join('\n');
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/totalconstruct-progress.md',markdown);
writeFileSync('artifacts/totalconstruct-progress.json',JSON.stringify({generatedAt:new Date().toISOString(),counts,tasks:tasks.map(t=>({number:t.number,title:t.title,status:stage(t),url:t.url,updatedAt:t.updatedAt})),pullRequests:prs.slice(0,30)},null,2));
console.log('Progress snapshot generated:',counts);
