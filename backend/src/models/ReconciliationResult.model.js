import mongoose from 'mongoose';

const reconciliationResultSchema = new mongoose.Schema({
  reconciliationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  purchaseUploadId: {
    type: String,
    required: true
  },
  gstr2bUploadId: {
    type: String,
    required: true
  },
  gstin: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  summary: {
    totalPurchaseRecords: { type: Number, default: 0 },
    totalGSTR2BRecords: { type: Number, default: 0 },
    matchedCount: { type: Number, default: 0 },
    unmatchedCount: { type: Number, default: 0 },
    missingInGSTR2B: { type: Number, default: 0 },
    amountMismatch: { type: Number, default: 0 },
    matchPercentage: { type: Number, default: 0 }
  },
  matchedRecords: [{
    purchaseRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseRecord'
    },
    gstr2bRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GSTR2BRecord'
    },
    invoiceNumber: String,
    gstin: String,
    purchaseAmount: Number,
    gstr2bAmount: Number,
    matchedAt: { type: Date, default: Date.now }
  }],
  unmatchedRecords: [{
    purchaseRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseRecord'
    },
    gstr2bRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GSTR2BRecord'
    },
    invoiceNumber: String,
    gstin: String,
    reason: {
      type: String,
      enum: [
        'missing_in_gstr2b',
        'amount_mismatch',
        'tax_mismatch',
        'date_mismatch',
        'missing_in_purchase'
      ]
    },
    purchaseAmount: Number,
    gstr2bAmount: Number,
    difference: Number,
    details: String
  }],
  processingTime: {
    type: Number // milliseconds
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

const ReconciliationResult = mongoose.model('ReconciliationResult', reconciliationResultSchema);
export default ReconciliationResult;
