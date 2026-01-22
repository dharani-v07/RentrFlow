const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    workOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder', required: true, index: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contractor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    invoiceNumber: { type: String, required: true, unique: true, index: true },

    items: { type: [invoiceItemSchema], default: [] },

    currency: { type: String, default: 'INR' },
    totalAmount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID'],
      default: 'DRAFT',
      index: true,
    },

    currentState: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID'],
      default: 'DRAFT',
      index: true,
    },

    notes: { type: String, trim: true },

    proofFiles: [
      {
        fileUrl: { type: String, required: true },
        originalName: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    approvedAt: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

invoiceSchema.index({ contractor: 1, status: 1 });
invoiceSchema.index({ agent: 1, status: 1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = { Invoice };
