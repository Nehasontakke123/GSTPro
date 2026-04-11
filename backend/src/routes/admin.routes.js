import express from 'express';
import {
  uploadGSTR2B,
  getGSTR2BHistory,
  getAllUsers,
  getDashboardStats,
  deleteGSTR2BBatch
} from '../controllers/admin.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = express.Router();

// All routes require admin role
router.use(protect, authorize('admin'));

router.post('/upload-gstr2b', upload.single('file'), uploadGSTR2B);
router.get('/gstr2b-history', getGSTR2BHistory);
router.get('/users', getAllUsers);
router.get('/stats', getDashboardStats);
router.delete('/gstr2b/:uploadId', deleteGSTR2BBatch);

export default router;
