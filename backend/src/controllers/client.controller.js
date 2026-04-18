import { v4 as uuidv4 } from 'uuid';
import { getPurchaseRecordModel } from '../models/PurchaseRecord.model.js';
import { getGSTR2BRecordModel } from '../models/GSTR2B.model.js';
import { getReconciliationResultModel } from '../models/ReconciliationResult.model.js';
import { parseFile, mapToPurchase, generateCSV } from '../utils/fileParser.js';
import { reconcileRecords } from '../services/reconciliation.service.js';
import { AppError } from '../middleware/error.middleware.js';

export const uploadPurchase = async (req, res, next) => {
  try {
    const PurchaseRecord = getPurchaseRecordModel();
    const GSTR2BRecord = getGSTR2BRecordModel();

    if (process.env.NODE_ENV === 'development') {
      console.log('Client upload req.body:', req.body);
      console.log('Client upload req.file:', req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        bufferSize: req.file.buffer?.length || 0
      } : null);
    }

    if (!req.file) {
      return next(new AppError('Please upload a CSV or Excel file', 400));
    }

    if (!req.file.buffer?.length) {
      return next(new AppError('Uploaded file is empty', 400));
    }

    const { gstr2bUploadId } = req.body;
    if (!gstr2bUploadId) {
      return next(new AppError('GSTR2B upload ID is required for reconciliation', 400));
    }

    const gstr2bExists = await GSTR2BRecord.findOne({ uploadId: gstr2bUploadId });
    if (!gstr2bExists) {
      return next(new AppError('GSTR2B upload batch not found. Please ask admin to upload GSTR2B data first.', 404));
    }

    const uploadId = uuidv4();

    let rows;
    try {
      rows = await parseFile(req.file);
    } catch (parseErr) {
      return next(new AppError(`File parsing failed: ${parseErr.message}`, 400));
    }

    if (!rows || rows.length === 0) {
      return next(new AppError('File is empty or has no valid data rows', 400));
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Purchase CSV Headers:', Object.keys(rows[0] || {}));
    }

    const mappedRows = rows.map((row) => mapToPurchase(row));
    const validRows = mappedRows.filter((record) => record.gstin && record.invoiceNumber);
    const invalidRows = mappedRows.length - validRows.length;
    const records = validRows.map((record) => ({ ...record, uploadId, uploadedBy: req.user.id }));

    if (records.length === 0) {
      const availableColumns = Object.keys(rows[0] || {}).join(', ');
      return next(new AppError(`No valid purchase records found. Ensure columns include GSTIN and Invoice Number. Parsed columns: ${availableColumns || 'none'}`, 400));
    }

    await PurchaseRecord.insertMany(records, { ordered: false });

    const gstin = records[0]?.gstin || '';
    const reconciliation = await reconcileRecords(uploadId, gstr2bUploadId, req.user.id, gstin);

    res.status(201).json({
      success: true,
      message: 'Purchase data uploaded and reconciliation completed',
      uploadId,
      parsedRows: rows.length,
      skippedRows: invalidRows,
      totalRecords: records.length,
      fileName: req.file.originalname,
      reconciliation
    });
  } catch (error) {
    next(error);
  }
};

export const getMyResults = async (req, res, next) => {
  try {
    const ReconciliationResult = getReconciliationResultModel();
    const results = await ReconciliationResult.find({
      initiatedBy: req.user.id,
      status: 'completed'
    }).sort({ createdAt: -1 }).limit(20);

    res.status(200).json({ success: true, count: results.length, data: results });
  } catch (error) {
    next(error);
  }
};

export const getResultById = async (req, res, next) => {
  try {
    const ReconciliationResult = getReconciliationResultModel();
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

export const downloadUnmatched = async (req, res, next) => {
  try {
    const ReconciliationResult = getReconciliationResultModel();
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
      GSTIN: r.gstin || '',
      Reason: r.reason?.replace(/_/g, ' ').toUpperCase() || '',
      'Purchase Amount': r.purchaseAmount ?? '',
      'GSTR2B Amount': r.gstr2bAmount ?? '',
      Difference: r.difference ?? '',
      Details: r.details || ''
    }));

    const csv = generateCSV(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="unmatched_${result.reconciliationId}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

export const getGSTR2BBatches = async (req, res, next) => {
  try {
    const GSTR2BRecord = getGSTR2BRecordModel();
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

    const data = batches.map((batch) => ({
      ...batch,
      id: batch.uploadId,
      name: `${batch.returnPeriod || 'No period'} - ${batch.totalRecords} records - ${new Date(batch.createdAt).toLocaleDateString('en-IN')}`
    }));

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};
