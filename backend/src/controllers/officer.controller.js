import ReconciliationResult from '../models/ReconciliationResult.model.js';
import { AppError } from '../middleware/error.middleware.js';
import { generateCSV } from '../utils/fileParser.js';

// @desc    Get all matched records
// @route   GET /api/officer/matched
// @access  Officer
export const getMatchedRecords = async (req, res, next) => {
  try {
    const { gstin, page = 1, limit = 50, search } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const query = { status: 'completed' };
    if (gstin) query.gstin = gstin;

    const results = await ReconciliationResult.find(query)
      .sort({ createdAt: -1 })
      .populate('initiatedBy', 'name email company')
      .lean();

    // Flatten matched records across all reconciliations
    let allMatched = [];
    for (const result of results) {
      for (const rec of result.matchedRecords || []) {
        if (!search || rec.invoiceNumber?.includes(search.toUpperCase()) || rec.gstin?.includes(search.toUpperCase())) {
          allMatched.push({
            reconciliationId: result.reconciliationId,
            invoiceNumber: rec.invoiceNumber,
            gstin: rec.gstin,
            purchaseAmount: rec.purchaseAmount,
            gstr2bAmount: rec.gstr2bAmount,
            matchedAt: rec.matchedAt,
            initiatedBy: result.initiatedBy
          });
        }
      }
    }

    const total = allMatched.length;
    const paginated = allMatched.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: paginated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all results overview
// @route   GET /api/officer/reconciliations
// @access  Officer
export const getAllReconciliations = async (req, res, next) => {
  try {
    const { status, gstin, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const query = {};
    if (status) query.status = status;
    if (gstin) query.gstin = gstin;

    const total = await ReconciliationResult.countDocuments(query);
    const results = await ReconciliationResult.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('initiatedBy', 'name email company')
      .select('-matchedRecords -unmatchedRecords');

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: results
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single reconciliation detail
// @route   GET /api/officer/reconciliations/:id
// @access  Officer
export const getReconciliationDetail = async (req, res, next) => {
  try {
    const result = await ReconciliationResult.findOne({
      reconciliationId: req.params.id
    })
      .populate('initiatedBy', 'name email company')
      .populate('matchedRecords.purchaseRecord')
      .populate('matchedRecords.gstr2bRecord')
      .populate('unmatchedRecords.purchaseRecord')
      .populate('unmatchedRecords.gstr2bRecord');

    if (!result) {
      return next(new AppError('Reconciliation not found', 404));
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Download full matched report as CSV
// @route   GET /api/officer/matched/download
// @access  Officer
export const downloadMatchedReport = async (req, res, next) => {
  try {
    const results = await ReconciliationResult.find({ status: 'completed' })
      .populate('initiatedBy', 'name email')
      .lean();

    const rows = [];
    let srNo = 1;
    for (const result of results) {
      for (const rec of result.matchedRecords || []) {
        rows.push({
          'Sr.No': srNo++,
          'Reconciliation ID': result.reconciliationId,
          'Invoice Number': rec.invoiceNumber || '',
          'GSTIN': rec.gstin || '',
          'Purchase Amount': rec.purchaseAmount ?? '',
          'GSTR2B Amount': rec.gstr2bAmount ?? '',
          'Status': 'MATCHED',
          'Matched At': rec.matchedAt ? new Date(rec.matchedAt).toLocaleDateString() : '',
          'Initiated By': result.initiatedBy?.name || ''
        });
      }
    }

    const csv = generateCSV(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="matched_report.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// @desc    Officer dashboard stats
// @route   GET /api/officer/stats
// @access  Officer
export const getOfficerStats = async (req, res, next) => {
  try {
    const [total, completed, processing, failed] = await Promise.all([
      ReconciliationResult.countDocuments(),
      ReconciliationResult.countDocuments({ status: 'completed' }),
      ReconciliationResult.countDocuments({ status: 'processing' }),
      ReconciliationResult.countDocuments({ status: 'failed' })
    ]);

    const aggResult = await ReconciliationResult.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          totalMatched: { $sum: '$summary.matchedCount' },
          totalUnmatched: { $sum: '$summary.unmatchedCount' },
          avgMatchPercentage: { $avg: '$summary.matchPercentage' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalReconciliations: total,
        completed,
        processing,
        failed,
        totalMatched: aggResult[0]?.totalMatched || 0,
        totalUnmatched: aggResult[0]?.totalUnmatched || 0,
        avgMatchPercentage: parseFloat((aggResult[0]?.avgMatchPercentage || 0).toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
};
