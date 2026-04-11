/**
 * Generates sample CSV files for testing the GST Reconciliation System Pro
 * Run: node scripts/generate-sample-csv.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../sample-data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Shared invoice pool
const invoices = [
  { inv: 'INV-2024-001', gstin: '27AAAPL1234C1ZT', supplierGstin: '27AABCU9603R1ZX', supplier: 'ABC Supplies Pvt Ltd',  taxable: 50000, igst: 9000, cgst: 0, sgst: 0 },
  { inv: 'INV-2024-002', gstin: '27AAAPL1234C1ZT', supplierGstin: '27BBBPL5678D2ZS', supplier: 'XYZ Traders',           taxable: 25000, igst: 0,    cgst: 2250, sgst: 2250 },
  { inv: 'INV-2024-003', gstin: '27AAAPL1234C1ZT', supplierGstin: '27CCCPL9012E3ZR', supplier: 'Delta Enterprises',     taxable: 75000, igst: 13500, cgst: 0,    sgst: 0 },
  { inv: 'INV-2024-004', gstin: '27AAAPL1234C1ZT', supplierGstin: '27DDDPL3456F4ZQ', supplier: 'Omega Corp',            taxable: 10000, igst: 0,     cgst: 900,  sgst: 900 },
  { inv: 'INV-2024-005', gstin: '27AAAPL1234C1ZT', supplierGstin: '27EEEPL7890G5ZP', supplier: 'Sigma Solutions',       taxable: 30000, igst: 5400,  cgst: 0,    sgst: 0 },
  { inv: 'INV-2024-006', gstin: '27AAAPL1234C1ZT', supplierGstin: '27FFFPL2345H6ZO', supplier: 'Beta Logistics',        taxable: 15000, igst: 0,     cgst: 1350, sgst: 1350 },
  { inv: 'INV-2024-007', gstin: '27AAAPL1234C1ZT', supplierGstin: '27GGGPL6789I7ZN', supplier: 'Gamma Industries',      taxable: 40000, igst: 7200,  cgst: 0,    sgst: 0 },
  { inv: 'INV-2024-008', gstin: '27AAAPL1234C1ZT', supplierGstin: '27HHHPL1234J8ZM', supplier: 'Theta Pharma',          taxable: 20000, igst: 0,     cgst: 1800, sgst: 1800 },
];

const total = (r) => r.taxable + r.igst + r.cgst + r.sgst;

// ─── GSTR2B Data (all 8 invoices, original amounts) ────────────────────────
const gstr2bRows = [
  'GSTIN,Invoice Number,Supplier GSTIN,Supplier Name,Invoice Date,Invoice Type,Taxable Amount,IGST,CGST,SGST,CESS,Total Amount,Return Period',
  ...invoices.map(r =>
    `${r.gstin},${r.inv},${r.supplierGstin},"${r.supplier}",15/03/2024,B2B,${r.taxable},${r.igst},${r.cgst},${r.sgst},0,${total(r)},032024`
  )
];

// ─── Purchase Data (mixed: 5 match, 1 amount mismatch, 1 missing in GSTR2B, 1 missing entirely) ─
const purchaseRows = [
  'GSTIN,Invoice Number,Supplier GSTIN,Supplier Name,Invoice Date,Taxable Amount,IGST,CGST,SGST,CESS,Total Amount,Description',
  // 5 perfect matches
  ...invoices.slice(0, 5).map(r =>
    `${r.gstin},${r.inv},${r.supplierGstin},"${r.supplier}",15/03/2024,${r.taxable},${r.igst},${r.cgst},${r.sgst},0,${total(r)},Purchase Invoice`
  ),
  // 1 amount mismatch (INV-2024-006 - wrong amounts)
  `${invoices[5].gstin},${invoices[5].inv},${invoices[5].supplierGstin},"${invoices[5].supplier}",15/03/2024,16000,0,1440,1440,0,18880,Purchase Invoice`,
  // 1 invoice not in GSTR2B at all
  `27AAAPL1234C1ZT,INV-2024-999,27ZZZPL9999Z9ZZ,"Ghost Vendor",15/03/2024,8000,1440,0,0,0,9440,Purchase Invoice`,
  // INV-2024-007 and INV-2024-008 missing from Purchase (will show as missing_in_purchase)
];

fs.writeFileSync(path.join(outDir, 'sample_gstr2b.csv'), gstr2bRows.join('\n'));
fs.writeFileSync(path.join(outDir, 'sample_purchase.csv'), purchaseRows.join('\n'));

console.log('✅ Sample CSV files generated in /sample-data/');
console.log('');
console.log('📄 sample_gstr2b.csv   → Upload as Admin (8 GSTR2B records)');
console.log('📄 sample_purchase.csv → Upload as Client (8 purchase records)');
console.log('');
console.log('Expected reconciliation result:');
console.log('  ✅ Matched:              5  (INV-001 to INV-005)');
console.log('  ❌ Amount Mismatch:      1  (INV-006)');
console.log('  ❌ Missing in GSTR2B:    1  (INV-999)');
console.log('  ❌ Missing in Purchase:  2  (INV-007, INV-008)');
