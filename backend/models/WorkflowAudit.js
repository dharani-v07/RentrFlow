const mongoose = require('mongoose');

const workflowAuditSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ['JOB', 'WORK_ORDER', 'INVOICE'],
      required: true,
      index: true,
    },

    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    fromState: { type: String, required: true, index: true },
    toState: { type: String, required: true, index: true },

    performedBy: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
      role: { type: String, enum: ['agent', 'contractor'], required: true, index: true },
    },

    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', index: true },
    workOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder', index: true },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', index: true },

    metadata: { type: Object },
  },
  { timestamps: true }
);

workflowAuditSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
workflowAuditSchema.index({ job: 1, createdAt: -1 });

const WorkflowAudit = mongoose.model('WorkflowAudit', workflowAuditSchema);

module.exports = { WorkflowAudit };
