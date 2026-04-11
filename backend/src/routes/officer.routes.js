import express from 'express';
import {
  getMatchedRecords,
  getAllReconciliations,
  getReconciliationDetail,
  downloadMatchedReport,
  getOfficerStats
} from '../controllers/officer.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require officer role (also allow admin)
router.use(protect, authorize('officer', 'admin'));

router.get('/matched', getMatchedRecords);
router.get('/matched/download', downloadMatchedReport);
router.get('/reconciliations', getAllReconciliations);
router.get('/reconciliations/:id', getReconciliationDetail);
router.get('/stats', getOfficerStats);

export default router;
