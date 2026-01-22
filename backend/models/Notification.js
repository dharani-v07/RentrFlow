const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    type: {
      type: String,
      enum: ['JOB', 'WORK_ORDER', 'INVOICE', 'CHAT', 'SYSTEM'],
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true },
    body: { type: String, trim: true },

    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', index: true },
    workOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder', index: true },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', index: true },

    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { Notification };
