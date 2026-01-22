const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    workOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder', index: true },

    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    senderRole: { type: String, enum: ['agent', 'contractor'], required: true },

    content: { type: String, required: true, trim: true },

    readAt: { type: Date },
  },
  { timestamps: true }
);

messageSchema.index({ job: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = { Message };
