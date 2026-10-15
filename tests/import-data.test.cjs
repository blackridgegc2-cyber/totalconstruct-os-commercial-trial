const {test}=require('node:test');const assert=require('node:assert/strict');
const {parseCSV,cents,extractBudget}=require('../tc-import-data');
test('CSV handles BOM, CRLF, escaped quotes and quoted multiline cells',()=>{assert.deepEqual(parseCSV('\uFEFFCode,Description,Amount\r\n01,"Design, \"\"civil\"\"\nreview",100.25\r\n'),[['Code','Description','Amount'],['01','Design, "civil"\nreview','100.25']]);assert.throws(()=>parseCSV('a,"unclosed'))});
test('money preserves credits and zero, rejects malformed or nonfinite source amounts',()=>{assert.equal(cents('($1,234.56)'),-123456);assert.equal(cents('0'),0);assert.equal(cents('0.29'),29);assert.equal(cents(''),null);for(const v of ['#REF!','1,23','NaN','Infinity','123abc','1.234',true,{},'(-5)'])assert.throws(()=>cents(v),String(v))});
test('budget ignores headings and totals, retains explicit zero forecast and revised values',()=>{
 const out=extractBudget([['Academic Orchard'],['Code','Description','Original Budget','Revised Budget','Forecast','Actual'],['01','Design','1,000.25','0','0','0.29'],['','Subtotal','1,000.25'],['02','Civil','(100.25)','',''],['','TOTAL','900']]);
 assert.equal(out.lines.length,2);assert.equal(out.totalOriginal,900);assert.equal(out.totalForecast,-100.25);assert.equal(out.lines[0].revisedBudget,0);assert.equal(out.lines[0].actual,.29);assert.equal(out.skipped.length,2);
});
test('ambiguous or invalid financial rows fail rather than create invented zero costs',()=>{assert.throws(()=>extractBudget([['Project budget 2026'],[1,2]]));assert.throws(()=>extractBudget([['Description','Budget'],['Bad formula','#VALUE!']]));assert.throws(()=>extractBudget([['Description','Amount'],['',100]]))});
