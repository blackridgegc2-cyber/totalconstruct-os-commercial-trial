'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {validateBudgetCSV,parseCSV,parseMoney}=require('../r1-project-budget-import-core.cjs');
const head='Project_Code,Agreement_Code,CSI_Division,Cost_Code,Cost_Description,Cost_Type,Quantity,Unit,Unit_Cost,Budget_Amount,Vendor_or_Trade,Phase,Notes';
const row=(code,type,amount='100.00',agreement='CONSTRUCTION')=>['ORCHARD',agreement,'03',code,'Concrete scope',type,'1','LS',amount,amount,'','Construction',''].join(',');
test('accepts standard budget template and totals cents',()=>{
 const r=validateBudgetCSV(head+'\n'+row('03-300','SUBCONTRACT'),{projectCode:'ORCHARD'});
 assert.equal(r.valid,true);assert.equal(r.totalCents,10000);assert.equal(r.rows[0].Cost_Code,'03-300');
});
test('retains leading zero CSI and custom codes',()=>{
 const r=validateBudgetCSV(head+'\n'+row('003-0007','MATERIAL'));
 assert.equal(r.rows[0].Cost_Code,'003-0007');
});
test('rejects unrecognized cost classifications',()=>{
 const r=validateBudgetCSV(head+'\n'+row('03-300','FEE_AND_LABOR'));
 assert.equal(r.valid,false);assert.match(r.errors[0].message,/Cost_Type/);
});
test('rejects duplicate cost type within agreement',()=>{
 const r=validateBudgetCSV(head+'\n'+row('03-300','LABOR')+'\n'+row('03-300','LABOR'));
 assert.equal(r.valid,false);assert.match(r.errors[0].message,/Duplicate/);
});
test('allows same CSI code split between subcontract and material',()=>{
 const r=validateBudgetCSV(head+'\n'+row('03-300','SUBCONTRACT')+'\n'+row('03-300','MATERIAL'));
 assert.equal(r.valid,true);assert.equal(r.totalCents,20000);
});
test('rejects project and agreement mismatches',()=>{
 const r=validateBudgetCSV(head+'\n'+row('03-300','LABOR'),{projectCode:'DIFFERENT',knownAgreements:['PRECONSTRUCTION']});
 assert.equal(r.valid,false);assert.match(r.errors[0].message,/Project_Code/);
});
test('rejects amount discrepancy',()=>{
 const r=validateBudgetCSV(head+'\n'+row('03-300','LABOR').replace('1,LS,100.00,100.00','2,LS,100.00,100.00'));
 assert.equal(r.valid,false);assert.match(r.errors[0].message,/does not match/);
});
test('CSV quotes and embedded commas parse correctly',()=>{
 const rows=parseCSV('A,B\n"Concrete, CIP","A ""quote"""');
 assert.deepEqual(rows,[['A','B'],['Concrete, CIP','A "quote"']]);
});
test('currency cents strict and no spreadsheet formulas',()=>{
 assert.equal(parseMoney('12.34'),1234);
 assert.throws(()=>parseMoney('=SUM(A1:A3)'));
});
