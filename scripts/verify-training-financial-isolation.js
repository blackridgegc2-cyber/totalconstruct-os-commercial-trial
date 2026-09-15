const fs=require('fs');
const src=fs.readFileSync('r1-training-isolation.js','utf8');
const required=[
  "job.startsWith('trn-')",
  "name.includes('totalconstruct training')",
  "'renderWip'",
  "setInterval(install,3000)",
  "state.projects=all.filter(p=>!isTrainingProject(p))"
];
for(const token of required){if(!src.includes(token)){console.error('Missing Training financial isolation guard:',token);process.exit(1)}}
console.log('Training financial isolation regression gate passed');
