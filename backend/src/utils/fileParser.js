import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
// ✅ FIX: xlsx is a CommonJS package. Use DEFAULT import (not namespace import)
// so that readFile, utils, etc. are correctly bound in Node.js ESM.
// ❌ Wrong:  import * as XLSX from 'xlsx'  → readFile is undefined
// ✅ Correct: import XLSX from 'xlsx'       → full API available
import XLSX from 'xlsx';

const pickFirst = (row, keys) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
};

const normalizeText = (value) => String(value ?? '').trim();
const normalizeUpper = (value) => normalizeText(value).toUpperCase();

const normalizeRow = (row) => {
  const normalized = {};

  for (const [key, value] of Object.entries(row || {})) {
    const normalizedKey = normalizeKey(key);
    normalized[normalizedKey] = value;
  }

  return normalized;
};

const extractInvoiceNumber = (value) => {
  if (!value) return '';
  if (typeof value === 'object') {
    return normalizeUpper(
      value.invoice_number ||
      value.invoice_no ||
      value.document_number ||
      value.doc_no ||
      value.number
    );
  }

  const text = normalizeText(value);
  if (!text) return '';

  const focusedPatterns = [
    /(?:invoice|inv)[^a-z0-9]{0,4}(?:number|no)?[^a-z0-9]{0,6}([a-z0-9][a-z0-9/_-]{2,})/i,
    /(?:document|doc)[^a-z0-9]{0,4}(?:number|no)?[^a-z0-9]{0,6}([a-z0-9][a-z0-9/_-]{2,})/i
  ];

  for (const pattern of focusedPatterns) {
    const match = text.match(pattern);
    if (match?.[1] && !['NO', 'NUMBER'].includes(match[1].toUpperCase())) {
      return normalizeUpper(match[1]);
    }
  }

  const tokens = text.match(/[A-Z0-9][A-Z0-9/_-]{2,}/gi) || [];
  const filtered = tokens.find((token) => !['INV', 'INVOICE', 'NO', 'NUMBER', 'DOC', 'DOCUMENT'].includes(token.toUpperCase()));
  return filtered ? normalizeUpper(filtered) : normalizeUpper(text);
};

const parseAmount = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  const cleaned = String(value).replace(/,/g, '').replace(/[^\d.-]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const normalized = normalizeText(value);
  if (!normalized) return null;

  const direct = new Date(normalized);
  if (!Number.isNaN(direct.getTime())) return direct;

  const match = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return null;

  const [, dd, mm, yy] = match;
  const year = yy.length === 2 ? `20${yy}` : yy;
  const parsed = new Date(`${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Normalize header keys to a standard lowercase underscored format.
 * Strips spaces, special chars → lowercase_underscore
 */
const normalizeKey = (key) =>
  String(key)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

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
  const normalizedRow = normalizeRow(row);
  const supplierGstin = normalizeUpper(pickFirst(row, [
    'supplier_gstin', 'suppliergstin', 'gstin_of_supplier', 'gstinofsupplier',
    'ctin', 'seller_gstin', 'vendor_gstin'
  ])) || normalizeUpper(pickFirst(normalizedRow, [
    'supplier_gstin', 'suppliergstin', 'gstin_of_supplier', 'gstinofsupplier',
    'ctin', 'seller_gstin', 'vendor_gstin'
  ]));
  const gstin = normalizeUpper(pickFirst(row, [
    'gstin', 'recipient_gstin', 'recipientgstin', 'buyer_gstin', 'customer_gstin',
    'gstin_of_recipient', 'gstinofrecipient', 'gstin_uin_of_recipient',
    'gstinuinofrecipient', 'gstinuin_of_recipient', 'gstin_uin',
    'gstin_of_supplier', 'gstinofsupplier'
  ])) || normalizeUpper(pickFirst(normalizedRow, [
    'gstin', 'recipient_gstin', 'recipientgstin', 'buyer_gstin', 'customer_gstin',
    'gstin_of_recipient', 'gstinofrecipient', 'gstin_uin_of_recipient',
    'gstinuinofrecipient', 'gstinuin_of_recipient', 'gstin_uin',
    'gstin_of_supplier', 'gstinofsupplier'
  ])) || supplierGstin;
  const taxableAmount = parseAmount(pickFirst(row, [
    'taxable_amount', 'taxable_value', 'taxable_val', 'taxable_amt', 'taxable'
  ])) || parseAmount(pickFirst(normalizedRow, [
    'taxable_amount', 'taxable_value', 'taxable_val', 'taxable_amt', 'taxable'
  ]));
  const igst = parseAmount(pickFirst(row, ['igst', 'integrated_tax'])) || parseAmount(pickFirst(normalizedRow, ['igst', 'integrated_tax']));
  const cgst = parseAmount(pickFirst(row, ['cgst', 'central_tax'])) || parseAmount(pickFirst(normalizedRow, ['cgst', 'central_tax']));
  const sgst = parseAmount(pickFirst(row, ['sgst', 'state_tax', 'utgst', 'ut_tax'])) || parseAmount(pickFirst(normalizedRow, ['sgst', 'state_tax', 'utgst', 'ut_tax']));
  const cess = parseAmount(pickFirst(row, ['cess', 'cess_amount'])) || parseAmount(pickFirst(normalizedRow, ['cess', 'cess_amount']));
  const totalAmount = parseAmount(pickFirst(row, [
    'total_amount', 'invoice_value', 'invoice_amount', 'total', 'total_value'
  ])) || parseAmount(pickFirst(normalizedRow, [
    'total_amount', 'invoice_value', 'invoice_amount', 'total', 'total_value'
  ])) || (taxableAmount + igst + cgst + sgst + cess);

  return {
    gstin,
    supplierGstin,
    supplierName: normalizeText(pickFirst(row, [
      'supplier_name', 'trade_name', 'legal_name', 'supplier_legal_name',
      'supplier_trade_name', 'vendor_name', 'name'
    ])) || normalizeText(pickFirst(normalizedRow, [
      'supplier_name', 'trade_name', 'tradelegal_name', 'legal_name', 'supplier_legal_name',
      'supplier_trade_name', 'vendor_name', 'name'
    ])),
    invoiceNumber: normalizeUpper(pickFirst(row, [
      'invoice_number', 'invoice_no', 'invoice_no_', 'invoice_num', 'inv_no',
      'bill_no', 'document_number', 'document_no', 'doc_no'
    ])) || normalizeUpper(pickFirst(normalizedRow, [
      'invoice_number', 'invoice_no', 'invoice_num', 'inv_no',
      'bill_no', 'document_number', 'document_no', 'doc_no'
    ])) || extractInvoiceNumber(pickFirst(normalizedRow, ['invoice_details'])),
    invoiceDate: parseDateValue(pickFirst(row, ['invoice_date', 'inv_date', 'bill_date', 'document_date'])) || parseDateValue(pickFirst(normalizedRow, ['invoice_date', 'inv_date', 'bill_date', 'document_date', 'irn_date'])),
    invoiceType: normalizeUpper(pickFirst(row, ['invoice_type', 'doc_type'])) || normalizeUpper(pickFirst(normalizedRow, ['invoice_type', 'doc_type'])) || 'B2B',
    taxableAmount,
    igst,
    cgst,
    sgst,
    cess,
    totalAmount,
    returnPeriod: normalizeText(pickFirst(row, ['return_period', 'ret_period', 'returnperiod', 'tax_period'])) || normalizeText(pickFirst(normalizedRow, ['return_period', 'ret_period', 'returnperiod', 'tax_period'])),
    rawData: normalizedRow
  };
};

/**
 * Map raw parsed row to a Purchase record shape
 */
export const mapToPurchase = (row) => {
  const normalizedRow = normalizeRow(row);
  const supplierGstin = normalizeUpper(pickFirst(row, [
    'supplier_gstin', 'vendor_gstin', 'party_gstin', 'seller_gstin',
    'gstin_of_supplier', 'gstinofsupplier', 'ctin'
  ])) || normalizeUpper(pickFirst(normalizedRow, [
    'supplier_gstin', 'vendor_gstin', 'party_gstin', 'seller_gstin',
    'gstin_of_supplier', 'gstinofsupplier', 'ctin'
  ]));
  const gstin = normalizeUpper(pickFirst(row, [
    'gstin', 'buyer_gstin', 'recipient_gstin', 'recipientgstin', 'gstin_of_recipient',
    'gstinofrecipient', 'gstin_of_supplier', 'gstinofsupplier', 'ctin'
  ])) || normalizeUpper(pickFirst(normalizedRow, [
    'gstin', 'buyer_gstin', 'recipient_gstin', 'recipientgstin', 'gstin_of_recipient',
    'gstinofrecipient', 'gstin_of_supplier', 'gstinofsupplier', 'ctin'
  ])) || supplierGstin;
  const taxableAmount = parseAmount(pickFirst(row, [
    'taxable_amount', 'taxable_value', 'taxable_val', 'taxable_amt', 'taxable'
  ])) || parseAmount(pickFirst(normalizedRow, [
    'taxable_amount', 'taxable_value', 'taxable_val', 'taxable_amt', 'taxable'
  ]));
  const taxAmount = parseAmount(pickFirst(normalizedRow, ['tax_amount']));
  const igst = parseAmount(pickFirst(row, ['igst', 'integrated_tax'])) || parseAmount(pickFirst(normalizedRow, ['igst', 'integrated_tax']));
  const cgst = parseAmount(pickFirst(row, ['cgst', 'central_tax'])) || parseAmount(pickFirst(normalizedRow, ['cgst', 'central_tax']));
  const sgst = parseAmount(pickFirst(row, ['sgst', 'state_tax', 'utgst', 'ut_tax'])) || parseAmount(pickFirst(normalizedRow, ['sgst', 'state_tax', 'utgst', 'ut_tax']));
  const cess = parseAmount(pickFirst(row, ['cess', 'cess_amount'])) || parseAmount(pickFirst(normalizedRow, ['cess', 'cess_amount']));
  const totalAmount = parseAmount(pickFirst(row, [
    'total_amount', 'invoice_value', 'invoice_amount', 'total', 'amount'
  ])) || parseAmount(pickFirst(normalizedRow, [
    'total_amount', 'invoice_value', 'invoice_amount', 'total', 'amount'
  ])) || (taxableAmount + igst + cgst + sgst + cess + taxAmount);

  return {
    gstin,
    supplierGstin,
    supplierName: normalizeText(pickFirst(row, [
      'supplier_name', 'vendor_name', 'party_name', 'supplier_trade_name', 'name'
    ])) || normalizeText(pickFirst(normalizedRow, [
      'supplier_name', 'vendor_name', 'party_name', 'supplier_trade_name', 'tradelegal_name', 'name'
    ])),
    invoiceNumber: normalizeUpper(pickFirst(row, [
      'invoice_number', 'invoice_no', 'invoice_num', 'bill_no', 'inv_no', 'document_number'
    ])) || normalizeUpper(pickFirst(normalizedRow, [
      'invoice_number', 'invoice_no', 'invoice_num', 'bill_no', 'inv_no', 'document_number'
    ])) || extractInvoiceNumber(pickFirst(normalizedRow, ['invoice_details'])),
    invoiceDate: parseDateValue(pickFirst(row, ['invoice_date', 'bill_date', 'inv_date', 'document_date'])) || parseDateValue(pickFirst(normalizedRow, ['invoice_date', 'bill_date', 'inv_date', 'document_date', 'irn_date', 'irin_date'])),
    taxableAmount,
    igst,
    cgst,
    sgst,
    cess,
    totalAmount,
    description: normalizeText(pickFirst(row, ['description', 'particulars', 'narration'])) || normalizeText(pickFirst(normalizedRow, ['description', 'particulars', 'narration', 'reason', 'source'])),
    rawData: normalizedRow
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
