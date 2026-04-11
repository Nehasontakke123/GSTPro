import { v4 as uuidv4 } from 'uuid';
import GSTR2BRecord from '../models/GSTR2B.model.js';
import User from '../models/User.model.js';
import ReconciliationResult from '../models/ReconciliationResult.model.js';
import { parseFile, mapToGSTR2B, deleteFile } from '../utils/fileParser.js';
import { AppError } from '../middleware/error.middleware.js';

// @desc    Upload GSTR2B CSV/Excel
// @route   POST /api/admin/upload-gstr2b
// @access  Admin
export const uploadGSTR2B = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('Please upload a CSV or Excel file', 400));
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
      .map(row => mapToGSTR2B(row))
      .filter(r => r.gstin && r.invoiceNumber)
      .map(r => ({ ...r, uploadId, uploadedBy: req.user.id }));

    if (records.length === 0) {
      deleteFile(filePath);
      return next(new AppError('No valid GSTR2B records found. Ensure columns include GSTIN and Invoice Number.', 400));
    }

    await GSTR2BRecord.insertMany(records, { ordered: false });
    deleteFile(filePath);

    res.status(201).json({
      success: true,
      message: `GSTR2B data uploaded successfully`,
      uploadId,
      totalRecords: records.length,
      fileName: req.file.originalname
    });
  } catch (error) {
    if (req.file?.path) deleteFile(req.file.path);
    next(error);
  }
};

// @desc    Get all GSTR2B upload history
// @route   GET /api/admin/gstr2b-history
// @access  Admin
export const getGSTR2BHistory = async (req, res, next) => {
  try {
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

    // Populate uploader info
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

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Admin
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Admin
export const getDashboardStats = async (req, res, next) => {
  try {
    const [userCount, gstr2bCount, purchaseCount, reconciliationCount] = await Promise.all([
      User.countDocuments(),
      GSTR2BRecord.countDocuments(),
      (await import('../models/PurchaseRecord.model.js')).default.countDocuments(),
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

// @desc    Delete GSTR2B upload batch
// @route   DELETE /api/admin/gstr2b/:uploadId
// @access  Admin
export const deleteGSTR2BBatch = async (req, res, next) => {
  try {
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
