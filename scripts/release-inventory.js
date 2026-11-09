// Source discovery, not an assertion that any control is functional.
const fs=require('node:fs');
const files=fs.readdirSync('.').filter(f=>/^(r1-|tc-|enterprise-forms|live\.js|index\.html)/.test(f)&&/\.(js|html)$/.test(f)).sort();
const modules=files.map(path=>({path,acceptance:'unverified'}));
const routes=new Map(),controls=[];
for(const file of files){const source=fs.readFileSync(file,'utf8');
 for(const match of source.matchAll(/data-(?:page|jump)=["']([\w-]+)["']/g)){const name=match[1];if(!routes.has(name))routes.set(name,{name,sources:[],acceptance:'unverified'});if(!routes.get(name).sources.includes(file))routes.get(name).sources.push(file)}
 for(const match of source.matchAll(/<button\b([^>]*?)>([^<]{1,160})/g)){const id=match[1].match(/\bid=["']([^"']+)["']/)?.[1]||null;controls.push({source:file,id,label:match[2].trim(),acceptance:'unverified'})}
}
const result={baseline:'5c9b0f7441cfe37fc8745fe4825983ef014fcd49',discovery:'Static candidate inventory; dynamic controls and runtime permissions require authenticated discovery. Unverified is not implemented or accepted.',routes:[...routes.values()].sort((a,b)=>a.name.localeCompare(b.name)),modules,controls};
fs.mkdirSync('docs/releases',{recursive:true});fs.writeFileSync('docs/releases/release-surface-inventory.json',JSON.stringify(result,null,2)+'\n');
console.log(`${result.routes.length} candidate routes, ${modules.length} modules, ${controls.length} candidate controls; all await authenticated acceptance.`);
