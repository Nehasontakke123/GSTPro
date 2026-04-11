/**
 * Full parse test: CSV + XLSX → mapToGSTR2B + mapToPurchase
 * Run: node scripts/test-parser.js
 */
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseFile, mapToGSTR2B, mapToPurchase } from '../src/utils/fileParser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;

const assert = (label, cond) => {
  if (cond) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
};

// ─── 1. Create a real XLSX file on disk, then parse it back ─────────────────
console.log('\n📑 Test 1: XLSX write → parseFile → mapToGSTR2B');

const xlsxPath = path.join(__dirname, '../sample-data/test_parsing.xlsx');

const wb = XLSX.utils.book_new();
const wsData = [
  ['GSTIN', 'Invoice Number', 'Supplier GSTIN', 'Supplier Name', 'Taxable Amount', 'IGST', 'CGST', 'SGST', 'Total Amount', 'Return Period'],
  ['27AAAPL1234C1ZT', 'INV-XL-001', '27AABCU9603R1ZX', 'Alpha Supplies', 50000, 9000, 0, 0, 59000, '032024'],
  ['27AAAPL1234C1ZT', 'INV-XL-002', '27BBBPL5678D2ZS', 'Beta Traders',  25000, 0, 2250, 2250, 29500, '032024'],
  ['27AAAPL1234C1ZT', 'INV-XL-003', '27CCCPL9012E3ZR', 'Gamma Corp',    10000, 0, 900,  900,  11800, '032024'],
];
const ws = XLSX.utils.aoa_to_sheet(wsData);
XLSX.utils.book_append_sheet(wb, ws, 'GSTR2B');
XLSX.writeFile(wb, xlsxPath);
console.log(`  Written: ${xlsxPath}`);

try {
  const rows = await parseFile(xlsxPath);
  assert('XLSX parsed without error', rows.length > 0);
  assert('Row count matches', rows.length === 3);

  const first = mapToGSTR2B(rows[0]);
  assert('GSTIN normalized correctly', first.gstin === '27AAAPL1234C1ZT');
  assert('Invoice number uppercased', first.invoiceNumber === 'INV-XL-001');
  assert('IGST parsed as number', first.igst === 9000);
  assert('Total amount correct', first.totalAmount === 59000);
  assert('Supplier name extracted', first.supplierName === 'Alpha Supplies');
  assert('Return period captured', first.returnPeriod === '032024');
} catch (err) {
  console.error('  ❌ EXCEPTION:', err.message);
  failed++;
}

// ─── 2. Parse sample CSV (GSTR2B) ──────────────────────────────────────────
console.log('\n📄 Test 2: CSV parseFile → mapToGSTR2B');

try {
  const csvPath = path.join(__dirname, '../sample-data/sample_gstr2b.csv');
  const rows = await parseFile(csvPath);
  assert('CSV parsed without error', rows.length > 0);
  assert('8 rows in sample GSTR2B', rows.length === 8);

  const mapped = rows.map(mapToGSTR2B);
  assert('All have GSTIN', mapped.every(r => r.gstin.length > 0));
  assert('All have invoice number', mapped.every(r => r.invoiceNumber.length > 0));
  assert('All have totalAmount >= 0', mapped.every(r => r.totalAmount >= 0));
} catch (err) {
  console.error('  ❌ EXCEPTION:', err.message);
  failed++;
}

// ─── 3. Parse sample CSV (Purchase) ────────────────────────────────────────
console.log('\n📄 Test 3: CSV parseFile → mapToPurchase');

try {
  const csvPath = path.join(__dirname, '../sample-data/sample_purchase.csv');
  const rows = await parseFile(csvPath);
  assert('Purchase CSV parsed', rows.length > 0);

  const mapped = rows.map(mapToPurchase);
  assert('All have GSTIN', mapped.every(r => r.gstin.length > 0));
  assert('All have invoiceNumber', mapped.every(r => r.invoiceNumber.length > 0));
} catch (err) {
  console.error('  ❌ EXCEPTION:', err.message);
  failed++;
}

// ─── 4. Unsupported extension handling ─────────────────────────────────────
console.log('\n🚫 Test 4: Unsupported file type throws');

try {
  await parseFile('/some/file.pdf');
  assert('Should have thrown for .pdf', false);
} catch (err) {
  assert('Throws on .pdf', err.message.includes('Unsupported file format'));
}

// ─── 5. Verifying import binding (root-cause regression check) ─────────────
console.log('\n🔬 Test 5: XLSX API binding (regression guard)');
assert('XLSX.readFile is a function',  typeof XLSX.readFile === 'function');
assert('XLSX.utils is an object',      typeof XLSX.utils === 'object');
assert('XLSX.utils.sheet_to_json is a function', typeof XLSX.utils.sheet_to_json === 'function');
assert('XLSX.utils.aoa_to_sheet is a function',  typeof XLSX.utils.aoa_to_sheet === 'function');

// ─── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(45)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('🎉 All tests passed! File parsing is working correctly.\n');
  process.exit(0);
} else {
  console.error(`💥 ${failed} test(s) failed.\n`);
  process.exit(1);
}
