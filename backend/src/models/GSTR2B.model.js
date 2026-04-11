import mongoose from 'mongoose';

const gstr2bRecordSchema = new mongoose.Schema({
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
  invoiceType: {
    type: String,
    enum: ['B2B', 'B2BA', 'CDNR', 'CDNRA', 'ISD', 'ISDA', 'IMPG', 'IMPS'],
    default: 'B2B'
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
  returnPeriod: {
    type: String,
    trim: true
  },
  filingDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },
  rawData: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound index for fast reconciliation lookup
gstr2bRecordSchema.index({ gstin: 1, invoiceNumber: 1 });
gstr2bRecordSchema.index({ uploadId: 1, gstin: 1 });

const GSTR2BRecord = mongoose.model('GSTR2BRecord', gstr2bRecordSchema);
export default GSTR2BRecord;
