const path = require('path');

const { AppError } = require('../utils/appError');

function clampString(val, { max = 2000 } = {}) {
  if (val == null) return undefined;
  const s = String(val).trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, max) : s;
}

function normalizeStringArray(val, { maxItems = 50, maxItemLen = 60 } = {}) {
  if (val == null) return undefined;

  const arr = Array.isArray(val) ? val : String(val).split(',');
  const cleaned = arr
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((x) => (x.length > maxItemLen ? x.slice(0, maxItemLen) : x));

  return cleaned;
}

function normalizeNumber(val) {
  if (val == null || val === '') return undefined;
  const n = Number(val);
  if (Number.isNaN(n)) return NaN;
  return n;
}

function buildProfileResponse(user) {
  return {
    id: user._id,
    role: user.role,
    name: user.name,
    fullName: user.fullName || user.name,
    email: user.email,
    phoneNumber: user.phoneNumber || user.phone || '',
    location: {
      city: user.location?.city || '',
      state: user.location?.state || '',
    },
    bio: user.bio || '',
    agentProfile: {
      organizationName: user.agentProfile?.organizationName || user.companyName || '',
      roleTitle: user.agentProfile?.roleTitle || '',
      managedPropertiesCount: user.agentProfile?.managedPropertiesCount ?? null,
      preferredContractorSkills: user.agentProfile?.preferredContractorSkills || [],
    },
    contractorProfile: {
      skills: user.contractorProfile?.skills || [],
      yearsOfExperience: user.contractorProfile?.yearsOfExperience ?? null,
      certifications: user.contractorProfile?.certifications || [],
      serviceAreas: user.contractorProfile?.serviceAreas || [],
      availabilityStatus: user.contractorProfile?.availabilityStatus || 'Available',
    },
  };
}

async function getMyProfile(req, res) {
  res.json({ success: true, profile: buildProfileResponse(req.user) });
}

async function updateMyProfile(req, res) {
  const user = req.user;

  const b = req.body || {};

  if (b.email != null || b.role != null) {
    
  }

  const nextFullName = clampString(b.fullName, { max: 80 });
  if (nextFullName !== undefined) {
    user.fullName = nextFullName;
    if (nextFullName) user.name = nextFullName;
  }

  const nextPhoneNumber = clampString(b.phoneNumber ?? b.phone, { max: 30 });
  if (nextPhoneNumber !== undefined) {
    user.phoneNumber = nextPhoneNumber;
    user.phone = nextPhoneNumber;
  }

  const nextBio = clampString(b.bio, { max: 500 });
  if (nextBio !== undefined) user.bio = nextBio;

  const nextCity = clampString(b?.location?.city ?? b.locationCity ?? b.city, { max: 60 });
  const nextState = clampString(b?.location?.state ?? b.locationState ?? b.state, { max: 60 });
  if (nextCity !== undefined || nextState !== undefined) {
    user.location = user.location || {};
    if (nextCity !== undefined) user.location.city = nextCity;
    if (nextState !== undefined) user.location.state = nextState;
  }

  if (user.role === 'contractor') {
    const skills = normalizeStringArray(b?.contractorProfile?.skills ?? b.skills, { maxItems: 50, maxItemLen: 40 });
    if (skills !== undefined) {
      user.contractorProfile = user.contractorProfile || {};
      user.contractorProfile.skills = skills;
    }

    const yrs = normalizeNumber(b?.contractorProfile?.yearsOfExperience ?? b.yearsOfExperience);
    if (yrs !== undefined) {
      if (Number.isNaN(yrs)) throw new AppError('yearsOfExperience must be a number', 400);
      if (yrs < 0) throw new AppError('yearsOfExperience must be >= 0', 400);
      user.contractorProfile = user.contractorProfile || {};
      user.contractorProfile.yearsOfExperience = yrs;
    }

    const certs = normalizeStringArray(b?.contractorProfile?.certifications ?? b.certifications, { maxItems: 50, maxItemLen: 60 });
    if (certs !== undefined) {
      user.contractorProfile = user.contractorProfile || {};
      user.contractorProfile.certifications = certs;
    }

    const areas = normalizeStringArray(b?.contractorProfile?.serviceAreas ?? b.serviceAreas, { maxItems: 50, maxItemLen: 80 });
    if (areas !== undefined) {
      user.contractorProfile = user.contractorProfile || {};
      user.contractorProfile.serviceAreas = areas;
    }

    const avail = clampString(b?.contractorProfile?.availabilityStatus ?? b.availabilityStatus, { max: 20 });
    if (avail !== undefined) {
      const allowed = ['Available', 'Busy', 'Unavailable'];
      if (avail && !allowed.includes(avail)) throw new AppError('Invalid availabilityStatus', 400);
      user.contractorProfile = user.contractorProfile || {};
      user.contractorProfile.availabilityStatus = avail || 'Available';
    }
  }

  if (user.role === 'agent') {
    const org = clampString(b?.agentProfile?.organizationName ?? b.organizationName, { max: 120 });
    if (org !== undefined) {
      user.agentProfile = user.agentProfile || {};
      user.agentProfile.organizationName = org;
      user.companyName = org;
    }

    const roleTitle = clampString(b?.agentProfile?.roleTitle ?? b.roleTitle, { max: 80 });
    if (roleTitle !== undefined) {
      user.agentProfile = user.agentProfile || {};
      user.agentProfile.roleTitle = roleTitle;
    }

    const managed = normalizeNumber(b?.agentProfile?.managedPropertiesCount ?? b.managedPropertiesCount);
    if (managed !== undefined) {
      if (Number.isNaN(managed)) throw new AppError('managedPropertiesCount must be a number', 400);
      if (managed < 0) throw new AppError('managedPropertiesCount must be >= 0', 400);
      user.agentProfile = user.agentProfile || {};
      user.agentProfile.managedPropertiesCount = managed;
    }

    const prefSkills = normalizeStringArray(
      b?.agentProfile?.preferredContractorSkills ?? b.preferredContractorSkills,
      { maxItems: 50, maxItemLen: 40 }
    );
    if (prefSkills !== undefined) {
      user.agentProfile = user.agentProfile || {};
      user.agentProfile.preferredContractorSkills = prefSkills;
    }
  }

  await user.save();

  res.json({ success: true, profile: buildProfileResponse(user) });
}

async function uploadMyResume(req, res) {
  if (!req.file) throw new AppError('Resume file is required', 400);

  const user = req.user;

  const fileUrl = `/uploads/${path.basename(req.file.path)}`;
  user.resumeUrl = fileUrl;
  user.resumeOriginalName = req.file.originalname || '';
  user.resumeUploadedAt = new Date();

  await user.save();

  res.status(201).json({
    success: true,
    resume: {
      resumeUrl: user.resumeUrl || '',
      resumeOriginalName: user.resumeOriginalName || '',
      resumeUploadedAt: user.resumeUploadedAt || null,
    },
  });
}

async function getMyResume(req, res) {
  const user = req.user;

  res.json({
    success: true,
    resume: user.resumeUrl
      ? {
          resumeUrl: user.resumeUrl,
          resumeOriginalName: user.resumeOriginalName || '',
          resumeUploadedAt: user.resumeUploadedAt || null,
        }
      : null,
  });
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadMyResume,
  getMyResume,
};
