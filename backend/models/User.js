const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['agent', 'contractor'],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    fullName: { type: String, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },

    profileImage: { type: String, trim: true },

    resumeUrl: { type: String, trim: true },
    resumeOriginalName: { type: String, trim: true },
    resumeUploadedAt: { type: Date },

    location: {
      city: { type: String, trim: true },
      state: { type: String, trim: true },
    },
    bio: { type: String, trim: true },

    companyName: { type: String, trim: true },

    agentProfile: {
      organizationName: { type: String, trim: true },
      roleTitle: { type: String, trim: true },
      managedPropertiesCount: { type: Number, min: 0 },
      preferredContractorSkills: [{ type: String, trim: true }],
    },

    contractorProfile: {
      skills: [{ type: String, trim: true }],
      yearsOfExperience: { type: Number, min: 0 },
      certifications: [{ type: String, trim: true }],
      serviceAreas: [{ type: String, trim: true }],
      availabilityStatus: {
        type: String,
        enum: ['Available', 'Busy', 'Unavailable'],
        default: 'Available',
      },
    },

    preferences: {
      theme: { type: String, enum: ['light', 'dark'], default: 'light' },
      notifications: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

module.exports = { User };
