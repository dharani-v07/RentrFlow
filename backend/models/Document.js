const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['agent', 'contractor'], required: true, index: true },

    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', index: true },
    workOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder', index: true },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', index: true },

    fileUrl: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },

    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

documentSchema.index({ job: 1, createdAt: -1 });

const Document = mongoose.model('Document', documentSchema);

module.exports = { Document };
