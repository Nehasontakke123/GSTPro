import { v4 as uuidv4 } from 'uuid';
import PurchaseRecord from '../models/PurchaseRecord.model.js';
import GSTR2BRecord from '../models/GSTR2B.model.js';
import ReconciliationResult from '../models/ReconciliationResult.model.js';
import { parseFile, mapToPurchase, deleteFile, generateCSV } from '../utils/fileParser.js';
import { reconcileRecords } from '../services/reconciliation.service.js';
import { AppError } from '../middleware/error.middleware.js';

// @desc    Upload Purchase CSV/Excel
// @route   POST /api/client/upload-purchase
// @access  Client
export const uploadPurchase = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please upload a CSV or Excel file', 400));
    }

    const { gstr2bUploadId } = req.body;
    if (!gstr2bUploadId) {
      return next(new AppError('GSTR2B upload ID is required for reconciliation', 400));
    }

    // Check if GSTR2B batch exists
    const gstr2bExists = await GSTR2BRecord.findOne({ uploadId: gstr2bUploadId });
    if (!gstr2bExists) {
      return next(new AppError('GSTR2B upload batch not found. Please ask admin to upload GSTR2B data first.', 404));
    }

    const uploadId = uuidv4();
    const filePath = req.file.path;

    let rows;
    try {
      rows = await parseFile(filePath);
    } catch (parseErr) {
      deleteFile(filePath);
      return next(new AppError(`File parsing failed: ${parseErr.message}`, 400));
    }

    if (!rows || rows.length === 0) {
      deleteFile(filePath);
      return next(new AppError('File is empty or has no valid data rows', 400));
    }

    const records = rows
      .map(row => mapToPurchase(row))
      .filter(r => r.gstin && r.invoiceNumber)
      .map(r => ({ ...r, uploadId, uploadedBy: req.user.id }));

    if (records.length === 0) {
      deleteFile(filePath);
      return next(new AppError('No valid purchase records found. Ensure columns include GSTIN and Invoice Number.', 400));
    }

    await PurchaseRecord.insertMany(records, { ordered: false });
    deleteFile(filePath);

    // Auto-trigger reconciliation
    const gstin = records[0]?.gstin || '';
    const reconciliation = await reconcileRecords(uploadId, gstr2bUploadId, req.user.id, gstin);

    res.status(201).json({
      success: true,
      message: 'Purchase data uploaded and reconciliation completed',
      uploadId,
      totalRecords: records.length,
      fileName: req.file.originalname,
      reconciliation
    });
  } catch (error) {
    if (req.file?.path) deleteFile(req.file.path);
    next(error);
  }
};

// @desc    Get client's reconciliation results
// @route   GET /api/client/results
// @access  Client
export const getMyResults = async (req, res, next) => {
  try {
    const results = await ReconciliationResult.find({
      initiatedBy: req.user.id,
      status: 'completed'
    }).sort({ createdAt: -1 }).limit(20);

    res.status(200).json({ success: true, count: results.length, data: results });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single reconciliation result by ID
// @route   GET /api/client/results/:reconciliationId
// @access  Client
export const getResultById = async (req, res, next) => {
  try {
    const result = await ReconciliationResult.findOne({
      reconciliationId: req.params.reconciliationId,
      initiatedBy: req.user.id
    })
      .populate('matchedRecords.purchaseRecord')
      .populate('matchedRecords.gstr2bRecord')
      .populate('unmatchedRecords.purchaseRecord')
      .populate('unmatchedRecords.gstr2bRecord');

    if (!result) {
      return next(new AppError('Reconciliation result not found', 404));
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Download unmatched records as CSV
// @route   GET /api/client/results/:reconciliationId/download
// @access  Client
export const downloadUnmatched = async (req, res, next) => {
  try {
    const result = await ReconciliationResult.findOne({
      reconciliationId: req.params.reconciliationId
    })
      .populate('unmatchedRecords.purchaseRecord')
      .populate('unmatchedRecords.gstr2bRecord');

    if (!result) {
      return next(new AppError('Reconciliation result not found', 404));
    }

    const rows = result.unmatchedRecords.map((r, idx) => ({
      'Sr.No': idx + 1,
      'Invoice Number': r.invoiceNumber || '',
      'GSTIN': r.gstin || '',
      'Reason': r.reason?.replace(/_/g, ' ').toUpperCase() || '',
      'Purchase Amount': r.purchaseAmount ?? '',
      'GSTR2B Amount': r.gstr2bAmount ?? '',
      'Difference': r.difference ?? '',
      'Details': r.details || ''
    }));

    const csv = generateCSV(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="unmatched_${result.reconciliationId}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// @desc    Get available GSTR2B batches for selection
// @route   GET /api/client/gstr2b-batches
// @access  Client
export const getGSTR2BBatches = async (req, res, next) => {
  try {
    const batches = await GSTR2BRecord.aggregate([
      {
        $group: {
          _id: '$uploadId',
          uploadId: { $first: '$uploadId' },
          totalRecords: { $sum: 1 },
          returnPeriod: { $first: '$returnPeriod' },
          createdAt: { $first: '$createdAt' }
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: 20 }
    ]);

    res.status(200).json({ success: true, count: batches.length, data: batches });
  } catch (error) {
    next(error);
  }
};
