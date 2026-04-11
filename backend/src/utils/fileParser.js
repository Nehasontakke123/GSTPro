import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
// ✅ FIX: xlsx is a CommonJS package. Use DEFAULT import (not namespace import)
// so that readFile, utils, etc. are correctly bound in Node.js ESM.
// ❌ Wrong:  import * as XLSX from 'xlsx'  → readFile is undefined
// ✅ Correct: import XLSX from 'xlsx'       → full API available
import XLSX from 'xlsx';

/**
 * Normalize header keys to a standard lowercase underscored format.
 * Strips spaces, special chars → lowercase_underscore
 */
const normalizeKey = (key) =>
  String(key).trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

/**
 * Parse CSV file using streaming csv-parser.
 * Returns Promise<Array<Object>>
 */
export const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv({ mapHeaders: ({ header }) => normalizeKey(header) }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
};

/**
 * Parse Excel file (.xlsx / .xls) using XLSX.readFile (Node.js only).
 * Returns Array<Object> with normalized headers.
 */
export const parseExcel = (filePath) => {
  try {
    // XLSX.readFile reads from the filesystem — only works in Node.js (backend)
    const workbook = XLSX.readFile(filePath, { cellDates: true, defval: '' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Excel file contains no sheets');
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const raw = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
      raw: false      // return formatted strings (not raw numbers) for consistency
    });

    return raw.map(row => {
      const normalized = {};
      for (const key of Object.keys(row)) {
        normalized[normalizeKey(key)] = row[key];
      }
      return normalized;
    });
  } catch (err) {
    throw new Error(`Excel parsing failed: ${err.message}`);
  }
};

/**
 * Auto-detect file type by extension and parse accordingly.
 * Returns Promise<Array<Object>>
 */
export const parseFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv')                  return await parseCSV(filePath);
  if (ext === '.xlsx' || ext === '.xls') return parseExcel(filePath);
  throw new Error(
    `Unsupported file format "${ext}". Only .csv, .xlsx, and .xls are accepted.`
  );
};

/**
 * Map raw parsed row to a GSTR2B record shape
 */
export const mapToGSTR2B = (row) => {
  const parse = (val) => parseFloat(String(val).replace(/,/g, '')) || 0;
  return {
    gstin: (row.gstin || row.recipient_gstin || row.buyer_gstin || '').toString().trim().toUpperCase(),
    supplierGstin: (row.supplier_gstin || row.gstin_of_supplier || row.ctin || '').toString().trim().toUpperCase(),
    supplierName: (row.supplier_name || row.trade_name || row.name || '').toString().trim(),
    invoiceNumber: (row.invoice_number || row.invoice_no || row.inv_no || row.bill_no || '').toString().trim().toUpperCase(),
    invoiceDate: row.invoice_date || row.inv_date || null,
    invoiceType: (row.invoice_type || row.doc_type || 'B2B').toString().toUpperCase(),
    taxableAmount: parse(row.taxable_amount || row.taxable_value || row.taxable || 0),
    igst: parse(row.igst || row.integrated_tax || 0),
    cgst: parse(row.cgst || row.central_tax || 0),
    sgst: parse(row.sgst || row.state_tax || row.utgst || 0),
    cess: parse(row.cess || 0),
    totalAmount: parse(row.total_amount || row.invoice_value || row.total || row.total_value || 0),
    returnPeriod: (row.return_period || row.ret_period || '').toString(),
    rawData: row
  };
};

/**
 * Map raw parsed row to a Purchase record shape
 */
export const mapToPurchase = (row) => {
  const parse = (val) => parseFloat(String(val).replace(/,/g, '')) || 0;
  return {
    gstin: (row.gstin || row.buyer_gstin || row.recipient_gstin || '').toString().trim().toUpperCase(),
    supplierGstin: (row.supplier_gstin || row.vendor_gstin || row.party_gstin || '').toString().trim().toUpperCase(),
    supplierName: (row.supplier_name || row.vendor_name || row.party_name || row.name || '').toString().trim(),
    invoiceNumber: (row.invoice_number || row.invoice_no || row.bill_no || row.inv_no || '').toString().trim().toUpperCase(),
    invoiceDate: row.invoice_date || row.bill_date || row.inv_date || null,
    taxableAmount: parse(row.taxable_amount || row.taxable_value || row.taxable || 0),
    igst: parse(row.igst || row.integrated_tax || 0),
    cgst: parse(row.cgst || row.central_tax || 0),
    sgst: parse(row.sgst || row.state_tax || 0),
    cess: parse(row.cess || 0),
    totalAmount: parse(row.total_amount || row.invoice_value || row.total || row.amount || 0),
    description: (row.description || row.particulars || '').toString().trim(),
    rawData: row
  };
};

/**
 * Delete file from disk
 */
export const deleteFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

/**
 * Generate CSV content from array of objects
 */
export const generateCSV = (data) => {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...rows].join('\n');
};
