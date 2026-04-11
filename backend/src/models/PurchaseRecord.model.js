import mongoose from 'mongoose';

const purchaseRecordSchema = new mongoose.Schema({
  uploadId: {
    type: String,
    required: true,
    index: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gstin: {
    type: String,
    required: [true, 'GSTIN is required'],
    trim: true,
    uppercase: true,
    index: true
  },
  supplierGstin: {
    type: String,
    trim: true,
    uppercase: true
  },
  supplierName: {
    type: String,
    trim: true
  },
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice Number is required'],
    trim: true,
    uppercase: true,
    index: true
  },
  invoiceDate: {
    type: Date
  },
  taxableAmount: {
    type: Number,
    required: true,
    min: 0
  },
  igst: {
    type: Number,
    default: 0,
    min: 0
  },
  cgst: {
    type: Number,
    default: 0,
    min: 0
  },
  sgst: {
    type: Number,
    default: 0,
    min: 0
  },
  cess: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'archived'],
    default: 'pending'
  },
  rawData: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound index for fast reconciliation lookup
purchaseRecordSchema.index({ gstin: 1, invoiceNumber: 1 });
purchaseRecordSchema.index({ uploadId: 1, uploadedBy: 1 });

const PurchaseRecord = mongoose.model('PurchaseRecord', purchaseRecordSchema);
export default PurchaseRecord;
