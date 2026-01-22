const mongoose = require('mongoose');

const workOrderSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, unique: true, index: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contractor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    workOrderNumber: { type: String, required: true, unique: true, index: true },
    scopeOfWork: { type: String, required: true, trim: true },
    terms: { type: String, trim: true },

    status: { type: String, enum: ['DRAFT', 'ISSUED', 'SIGNED', 'CLOSED'], default: 'ISSUED', index: true },

    currentState: {
      type: String,
      enum: ['CREATED', 'ACTIVE', 'VERIFIED', 'CLOSED'],
      default: 'ACTIVE',
      index: true,
    },

    attachments: [
      {
        fileUrl: { type: String, required: true },
        originalName: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const WorkOrder = mongoose.model('WorkOrder', workOrderSchema);

module.exports = { WorkOrder };
