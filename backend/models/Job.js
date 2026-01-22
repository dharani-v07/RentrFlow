const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    location: { type: String, trim: true },

    area: { type: String, trim: true, index: true },

    requiredSkills: [{ type: String, trim: true }],

    status: {
      type: String,
      enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'OPEN',
      index: true,
    },

    currentState: {
      type: String,
      enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'],
      default: 'OPEN',
      index: true,
    },

    budget: {
      currency: { type: String, default: 'INR' },
      amount: { type: Number, default: 0 },
    },

    assignedContractor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    applicants: [
      {
        contractor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        note: { type: String, trim: true },
        status: { type: String, enum: ['APPLIED', 'REJECTED', 'ACCEPTED'], default: 'APPLIED' },
        appliedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

jobSchema.index({ createdBy: 1, status: 1 });
jobSchema.index({ assignedContractor: 1, status: 1 });

const Job = mongoose.model('Job', jobSchema);

module.exports = { Job };
