import api from './api';

async function getMyProfile() {
  const { data } = await api.get('/api/users/me/profile');
  return data;
}

async function updateMyProfile(payload) {
  if (payload && payload.profileImageFile instanceof File) {
    const form = new FormData();

    if (payload.profileImageFile) form.append('profileImage', payload.profileImageFile);

    if (payload.fullName != null) form.append('fullName', payload.fullName);
    if (payload.phoneNumber != null) form.append('phoneNumber', payload.phoneNumber);
    if (payload.bio != null) form.append('bio', payload.bio);

    if (payload.location && typeof payload.location === 'object') {
      if (payload.location.city != null) form.append('locationCity', payload.location.city);
      if (payload.location.state != null) form.append('locationState', payload.location.state);
    }

    if (payload.contractorProfile && typeof payload.contractorProfile === 'object') {
      if (payload.contractorProfile.skills) form.append('skills', payload.contractorProfile.skills.join(','));
      if (payload.contractorProfile.certifications) form.append('certifications', payload.contractorProfile.certifications.join(','));
      if (payload.contractorProfile.serviceAreas) form.append('serviceAreas', payload.contractorProfile.serviceAreas.join(','));
      if (payload.contractorProfile.yearsOfExperience != null) {
        form.append('yearsOfExperience', String(payload.contractorProfile.yearsOfExperience));
      }
      if (payload.contractorProfile.availabilityStatus != null) {
        form.append('availabilityStatus', payload.contractorProfile.availabilityStatus);
      }
    }

    if (payload.agentProfile && typeof payload.agentProfile === 'object') {
      if (payload.agentProfile.organizationName != null) form.append('organizationName', payload.agentProfile.organizationName);
      if (payload.agentProfile.roleTitle != null) form.append('roleTitle', payload.agentProfile.roleTitle);
      if (payload.agentProfile.managedPropertiesCount != null) {
        form.append('managedPropertiesCount', String(payload.agentProfile.managedPropertiesCount));
      }
      if (payload.agentProfile.preferredContractorSkills) {
        form.append('preferredContractorSkills', payload.agentProfile.preferredContractorSkills.join(','));
      }
    }

    const { data } = await api.put('/api/users/me/profile', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return data;
  }

  const { profileImageFile, ...body } = payload || {};
  const { data } = await api.put('/api/users/me/profile', body);
  return data;
}

export { getMyProfile, updateMyProfile };
