const fs=require('fs');
const fixture=JSON.parse(fs.readFileSync('scripts/training-financial-isolation-fixture.json','utf8'));
const src=fs.readFileSync('r1-training-isolation.js','utf8');
if(!fixture.job.toLowerCase().startsWith('trn-'))process.exit(1);
if(!src.includes("job.startsWith('trn-')"))throw new Error('TRN job convention is not excluded');
if(!fixture.mustBeExcludedFromProductionTotals)throw new Error('Fixture must be production-excluded');
console.log('Authenticated Training WIP fixture is covered by production exclusion');
