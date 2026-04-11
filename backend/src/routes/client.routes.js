import express from 'express';
import {
  uploadPurchase,
  getMyResults,
  getResultById,
  downloadUnmatched,
  getGSTR2BBatches
} from '../controllers/client.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = express.Router();

// All routes require client role (also allow admin/officer for testing)
router.use(protect, authorize('client', 'admin', 'officer'));

router.post('/upload-purchase', upload.single('file'), uploadPurchase);
router.get('/results', getMyResults);
router.get('/results/:reconciliationId', getResultById);
router.get('/results/:reconciliationId/download', downloadUnmatched);
router.get('/gstr2b-batches', getGSTR2BBatches);

export default router;
