import { v4 as uuidv4 } from 'uuid';
import { getGSTR2BRecordModel } from '../models/GSTR2B.model.js';
import { getPurchaseRecordModel } from '../models/PurchaseRecord.model.js';
import { getReconciliationResultModel } from '../models/ReconciliationResult.model.js';
import { getUserModel } from '../models/User.model.js';
import { parseFile, mapToGSTR2B } from '../utils/fileParser.js';
import { AppError } from '../middleware/error.middleware.js';

export const uploadGSTR2B = async (req, res, next) => {
  try {
    const GSTR2BRecord = getGSTR2BRecordModel();

    if (process.env.NODE_ENV === 'development') {
      console.log('Admin upload req.body:', req.body);
      console.log('Admin upload req.file:', req.file ? {
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

    const records = rows
      .map(row => mapToGSTR2B(row))
      .filter(r => r.gstin && r.invoiceNumber)
      .map(r => ({ ...r, uploadId, uploadedBy: req.user.id }));

    if (records.length === 0) {
      const availableColumns = Object.keys(rows[0] || {}).join(', ');
      return next(new AppError(`No valid GSTR2B records found. Ensure columns include GSTIN and Invoice Number. Parsed columns: ${availableColumns || 'none'}`, 400));
    }

    await GSTR2BRecord.insertMany(records, { ordered: false });

    res.status(201).json({
      success: true,
      message: 'GSTR2B data uploaded successfully',
      uploadId,
      parsedRows: rows.length,
      totalRecords: records.length,
      fileName: req.file.originalname
    });
  } catch (error) {
    next(error);
  }
};

export const getGSTR2BHistory = async (req, res, next) => {
  try {
    const GSTR2BRecord = getGSTR2BRecordModel();
    const User = getUserModel();

    const history = await GSTR2BRecord.aggregate([
      {
        $group: {
          _id: '$uploadId',
          uploadId: { $first: '$uploadId' },
          uploadedBy: { $first: '$uploadedBy' },
          totalRecords: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          returnPeriod: { $first: '$returnPeriod' },
          createdAt: { $first: '$createdAt' }
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: 50 }
    ]);

    const userIds = [...new Set(history.map(h => h.uploadedBy?.toString()).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).select('name email');
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    const enriched = history.map(h => ({
      ...h,
      uploadedByUser: h.uploadedBy ? userMap.get(h.uploadedBy.toString()) : null
    }));

    res.status(200).json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const User = getUserModel();
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const User = getUserModel();
    const GSTR2BRecord = getGSTR2BRecordModel();
    const PurchaseRecord = getPurchaseRecordModel();
    const ReconciliationResult = getReconciliationResultModel();

    const [userCount, gstr2bCount, purchaseCount, reconciliationCount] = await Promise.all([
      User.countDocuments(),
      GSTR2BRecord.countDocuments(),
      PurchaseRecord.countDocuments(),
      ReconciliationResult.countDocuments({ status: 'completed' })
    ]);

    const recentReconciliations = await ReconciliationResult.find({ status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('initiatedBy', 'name email');

    res.status(200).json({
      success: true,
      stats: {
        totalUsers: userCount,
        totalGSTR2BRecords: gstr2bCount,
        totalPurchaseRecords: purchaseCount,
        totalReconciliations: reconciliationCount
      },
      recentReconciliations
    });
  } catch (error) {
    next(error);
  }
};

export const deleteGSTR2BBatch = async (req, res, next) => {
  try {
    const GSTR2BRecord = getGSTR2BRecordModel();
    const { uploadId } = req.params;
    const result = await GSTR2BRecord.deleteMany({ uploadId });
    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} GSTR2B records`,
      uploadId
    });
  } catch (error) {
    next(error);
  }
};
