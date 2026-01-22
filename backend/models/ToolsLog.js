const mongoose = require('mongoose');

const toolsLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['agent', 'contractor'], required: true, index: true },

    toolName: {
      type: String,
      enum: [
        'JOB_STATUS_TRACKER',
        'INVOICE_GENERATOR',
        'WORK_ORDER_AUTO_GENERATOR',
        'COST_ESTIMATION',
        'DOCUMENT_MANAGER',
        'NOTIFICATION_CENTER',
        'ANALYTICS_OVERVIEW',
        'SETTINGS_PREFERENCES'
      ],
      required: true,
      index: true,
    },

    action: { type: String, required: true, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

toolsLogSchema.index({ user: 1, createdAt: -1 });

const ToolsLog = mongoose.model('ToolsLog', toolsLogSchema);

module.exports = { ToolsLog };
